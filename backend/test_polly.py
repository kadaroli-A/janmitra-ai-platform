import boto3

polly = boto3.client("polly")

response = polly.synthesize_speech(
    Text="Welcome to JanMitra AI",
    VoiceId="Raveena",
    OutputFormat="mp3"
)

with open("speech.mp3","wb") as f:
    f.write(response["AudioStream"].read())
    
