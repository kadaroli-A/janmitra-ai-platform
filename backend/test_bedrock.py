import boto3
import json

client = boto3.client("bedrock-runtime", region_name="us-east-1")

prompt = "Explain PM Kisan scheme in simple English."

body = {
    "prompt": prompt,
    "max_gen_len": 300,
    "temperature": 0.5,
    "top_p": 0.9
}

response = client.invoke_model(
    modelId="meta.llama3-8b-instruct-v1:0",
    contentType="application/json",
    accept="application/json",
    body=json.dumps(body)
)

result = json.loads(response["body"].read())

print(result)
