# Use an official Python runtime as a parent image
FROM python:3.9-slim

# Set the working directory in the container
WORKDIR /code

# Copy the requirements file into the container
COPY ./requirements.txt /code/requirements.txt

# Install any needed packages specified in requirements.txt
RUN pip install --no-cache-dir --upgrade -r /code/requirements.txt

# Copy the rest of the application's code into the container
COPY . /code/

# Command to run the app. Hugging Face Spaces use port 7860 by default.
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]