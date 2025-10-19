// Selecting DOM elements

// Selecting DOM elements
const form = document.getElementById('upload-form');
const fileInput = document.getElementById('file-input');
const promptInput = document.getElementById('prompt-input');
const imagePreview = document.getElementById('image-preview');
const uploadPlaceholder = document.getElementById('upload-placeholder');
const polaroidFrame = document.querySelector('.polaroid');
const resultArea = document.getElementById('result-area');
const resultText = document.getElementById('result-text');
const loadingSpinner = document.getElementById('loading-spinner');
const submitButton = document.getElementById('submit-button');
const suggestAnotherBtn = document.getElementById('suggest-another-btn'); // New button
const styleFilterGroup = document.getElementById('style-filter-group');


// --- State Variables ---
let lastSubmittedFile = null; // To store the last used image file

// --- Event Listeners (no changes to these two) ---
polaroidFrame.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            imagePreview.src = e.target.result;
            imagePreview.classList.remove('hidden');
            uploadPlaceholder.classList.add('hidden');
        };
        reader.readAsDataURL(file);
    }
});

styleFilterGroup.addEventListener('click', (event) => {
    // Check if a button was clicked
    if (event.target.tagName === 'BUTTON') {
        // Remove 'active' class from all buttons in the group
        styleFilterGroup.querySelectorAll('button').forEach(btn => {
            btn.classList.remove('active');
        });
        // Add 'active' class to the clicked button
        event.target.classList.add('active');
    }
});


// --- Main Form Submission ---
form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const file = fileInput.files[0];
    const prompt = promptInput.value;

    if (!file || !prompt) {
        alert("Please upload an image and enter a prompt!");
        return;
    }
    // Store the file for later use
    lastSubmittedFile = file;
    // Call our new reusable function
    getOutfitSuggestion(file, prompt, false);
});


// --- "Suggest Another" Button Click ---
suggestAnotherBtn.addEventListener('click', () => {
    if (!lastSubmittedFile) {
        alert("Something went wrong, please submit a new image.");
        return;
    }
    const prompt = promptInput.value;
    // Call the reusable function with the "variation" flag set to true
    getOutfitSuggestion(lastSubmittedFile, prompt, true);
});


// --- Reusable API Call Function ---
async function getOutfitSuggestion(file, prompt, isVariation) {
    // 1. Start Loading State
    submitButton.disabled = true;
    suggestAnotherBtn.classList.add('hidden');
    submitButton.textContent = 'Getting Advice...';
    loadingSpinner.classList.remove('hidden');
    resultArea.classList.add('hidden');
    resultArea.classList.remove('fade-in', 'error-box');
    resultText.innerHTML = '';

    const formData = new FormData();
    formData.append('file', file);
    formData.append('prompt', prompt);

    const activeButtonStyle = styleFilterGroup.querySelector('button.active');
    const style = activeButtonStyle ? activeButtonStyle.dataset.style : 'any style';
    formData.append('style', style);
    
    if (isVariation) {
        formData.append('variation', 'true');
    }

    try {
        const response = await fetch('http://127.0.0.1:8000/suggest-outfit', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            const detail = errorData?.detail || `HTTP error! Status: ${response.status}`;
            throw new Error(detail);
        }

        const data = await response.json();
        
        // 2. Handle Success
        resultArea.classList.remove('hidden');
        resultArea.classList.add('fade-in');
        displaySuggestion(data);
        suggestAnotherBtn.classList.remove('hidden'); // Show the button!

    } catch (error) {
        console.error('Error fetching data:', error);
        // 3. Handle Errors
        resultArea.classList.remove('hidden');
        resultArea.classList.add('error-box');
        resultText.textContent = `Error: ${error.message}`;
    } finally {
        // 4. End Loading State
        loadingSpinner.classList.add('hidden');
        submitButton.disabled = false;
        submitButton.textContent = 'Get Advice';
    }
}

/// In frontend/script.js

// This new helper function will create the typing animation
function typewriter(element, text, speed = 20) {
    let i = 0;
    element.innerHTML = ''; // Clear the element first
    
    function type() {
        if (i < text.length) {
            // Handle HTML tags like <strong>
            if (text.substring(i, i + 8) === '<strong>') {
                const endTagIndex = text.indexOf('</strong>', i);
                element.innerHTML += text.substring(i, endTagIndex + 9);
                i = endTagIndex + 9;
            } else {
                element.innerHTML += text.charAt(i);
                i++;
            }
            setTimeout(type, speed);
        }
    }
    type();
}


// Replace your old displaySuggestion function with this new one
function displaySuggestion(data) {
    // Clear any previous results
    resultText.innerHTML = ''; 

    // Create a title for the outfit
    const title = document.createElement('h3');
    title.className = 'outfit-title';
    resultText.appendChild(title);
    // Use the typewriter function for the title
    typewriter(title, data.outfit_name);

    // Create a list for the items
    const list = document.createElement('ul');
    list.className = 'outfit-items';
    resultText.appendChild(list);
    
    // Animate each list item one by one
    let delay = data.outfit_name.length * 20; // Start after title finishes
    data.items.forEach(item => {
        const listItem = document.createElement('li');
        list.appendChild(listItem);
        const itemText = `<strong>${item.category}:</strong> ${item.description}`;
        setTimeout(() => typewriter(listItem, itemText), delay);
        delay += itemText.length * 20;
    });

    // Create a paragraph for the style tip
    const tip = document.createElement('p');
    tip.className = 'style-tip';
    resultText.appendChild(tip);
    const tipText = `<strong>Style Tip:</strong> ${data.style_tip}`;
    // Animate the tip after the list items
    setTimeout(() => typewriter(tip, tipText), delay);
}