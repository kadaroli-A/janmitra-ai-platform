import boto3
import json

bedrock = boto3.client(
    service_name="bedrock-runtime",
    region_name="us-east-1"
)

def ask_bedrock(question):

    prompt = f"""
You are an AI assistant that explains Indian government schemes simply.

Question:
{question}

Explain clearly.
"""

    body = {
        "inputText": prompt,
        "textGenerationConfig": {
            "maxTokenCount": 300,
            "temperature": 0.5,
            "topP": 0.9
        }
    }

    response = bedrock.invoke_model(
        modelId="amazon.titan-text-lite-v1",
        body=json.dumps(body),
        contentType="application/json",
        accept="application/json"
    )

    response_body = json.loads(response["body"].read())

    return response_body["results"][0]["outputText"]