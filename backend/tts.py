import boto3

polly = boto3.client("polly")

def generate_voice(text):

    response = polly.synthesize_speech(
        Text=text,
        VoiceId="Raveena",
        OutputFormat="mp3"
    )

    file_path = "speech.mp3"

    with open(file_path, "wb") as f:
        f.write(response["AudioStream"].read())

    return file_path