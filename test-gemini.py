# test_gemini.py

import os
import google.generativeai as genai
from dotenv import load_dotenv

print("--- Starting Gemini Connection Test ---")

try:
    # 1. Load API Key
    load_dotenv()
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY not found in .env file!")
    
    genai.configure(api_key=api_key)
    print("1. API Key configured successfully.")

    # 2. Initialize a simple text model
    # We use gemini-2.5-flash-lite as it's a basic, reliable model for a simple text test.
    model = genai.GenerativeModel("gemini-2.5-flash-lite")
    print("2. Model 'gemini-2.5-flash-lite' initialized.")

    # 3. Send the request
    print("3. Sending a simple request to Gemini...")
    response = model.generate_content("Say hello")
    
    print("4. SUCCESS! Response received from Gemini.")
    print("\n--- RESPONSE ---")
    print(response.text)
    print("------------------")

except Exception as e:
    print("\n--- AN ERROR OCCURRED ---")
    print(e)
    print("-------------------------")