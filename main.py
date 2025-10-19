import os
import json
from google import generativeai as genai
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List
import traceback
import hashlib


class OutfitItem(BaseModel):
    # name: str = Field(..., example="Red Dress")
    category: str = Field(..., example="Category of the clothing item (e.g., Top, Bottom, Shoes)")
    # color: str = Field(..., example="Red, blue, green, etc.")
    # occasion: str = Field(..., example="Casual, formal, party, etc.")
    description: str = Field(..., example="A brief description of the suggested item")

class OutfitSuggestionResponse(BaseModel):
    outfit_name: str = Field(..., description="A creative name for the outfit")
    items: List[OutfitItem]
    style_tip: str = Field(..., description="A short tip on wearing or adapting the outfit")


load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))


app = FastAPI()


# origins = [
#     "http://127.0.0.1:5500",
#     "http://localhost:8000",
# ]


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

model = genai.GenerativeModel("gemini-2.5-flash-lite")


JSON_PROMPT_INSTRUCTION = """
You are a fashion stylist AI. Based on the user's image and request,
provide a creative outfit suggestion.

Respond ONLY with a valid JSON object that follows this exact structure:
{
  "outfit_name": "A Creative Name for the Outfit",
  "items": [
    {"category": "Item Category (e.g., Top, Bottom)", "description": "Description of the item"}
  ],
  "style_tip": "A helpful style tip."
}

Do not include any other text or markdown formatting like ```json.
"""


cache = {}

@app.post("/suggest-outfit", response_model=OutfitSuggestionResponse)
async def suggest_outfit(file: UploadFile = File(...), prompt: str= Form(...), variation: bool = Form(False), style: str = Form("any style")):
    try:
        contents = await file.read()

        image_hash = hashlib.sha256(contents).hexdigest()
        cache_key = f"{image_hash}-{prompt}-{style}"

        if not variation and cache_key in cache:
            print("✅ Cache hit! Serving from cache.")
            return cache[cache_key]
        
        print("❌ Cache miss or variation request! Calling Gemini API.")

        image_parts = {
            "mime_type": file.content_type,
            "data": contents
        }

        # Validate that the image contains clothing
        validation_prompt = "Does this image primarily feature an article of clothing that can be worn? Respond with only the word 'YES' or 'NO'."
        
        validation_response = model.generate_content([validation_prompt, image_parts])
        is_clothing = validation_response.text.strip().upper()

        if "YES" not in is_clothing:
            raise HTTPException(
                status_code=400,
                detail="No clothing item was detected in the image. Please upload a picture of an article of clothing."
            )
        
        # Validate that the prompt is fashion-related
        intent_prompt = f"Is the following user request related to fashion, clothing, style, or outfits? Respond with only the word 'YES' or 'NO'. Request: '{prompt}'"
        intent_response = model.generate_content(intent_prompt) # Text-only call
        is_fashion_related = intent_response.text.strip().upper()

        if "YES" not in is_fashion_related:
            raise HTTPException(
                status_code=400,
                detail="Your request does not seem to be related to fashion. Please provide a styling prompt."
            )

        persona = "You are a fashion stylist AI."
        if style != "any style":
            persona = f"You are a fashion stylist AI specializing in {style} fashion."

        # Construct the final prompt
        full_prompt = (
                f"{persona}\n"
                f"{JSON_PROMPT_INSTRUCTION}\n\n"
                f"User Request: {prompt}\n"
                f"Style Preference: {style}"
        )
            
        if variation:
            full_prompt += "\n\nImportant: Provide a different and unique alternative to any previous suggestions."
            
        response = model.generate_content([full_prompt, image_parts])
            
        response_text = response.text.strip().replace("```json", "").replace("```", "")
        suggestion_data = json.loads(response_text)

        if not variation:
            print(f"📥 Storing new result in cache with key: {cache_key}")
            cache[cache_key] = suggestion_data

            # cache[cache_key] = suggestion_data

        return OutfitSuggestionResponse(**suggestion_data)


    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)