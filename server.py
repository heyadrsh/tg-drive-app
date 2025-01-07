from flask import Flask, request, jsonify
from telegram import Bot
import os
from dotenv import load_dotenv

load_dotenv()

# Check for required environment variables
if not os.getenv('BOT_TOKEN'):
    raise ValueError("BOT_TOKEN environment variable is required")

app = Flask(__name__)
bot = Bot(token=os.getenv('BOT_TOKEN'))

@app.route('/')
def home():
    return "Telegram Drive Bot is running!"

@app.route('/webhook', methods=['POST'])
async def webhook():
    try:
        data = request.get_json()
        
        # Handle incoming messages
        if 'message' in data:
            chat_id = data['message']['chat']['id']
            if 'document' in data['message']:
                # Handle file upload
                doc = data['message']['document']
                await bot.send_message(
                    chat_id=chat_id,
                    text=f"✅ File saved: {doc['file_name']} ({formatSize(doc['file_size'])})"
                )
            elif 'text' in data['message']:
                # Handle commands
                text = data['message']['text']
                if text == '/start':
                    await bot.send_message(
                        chat_id=chat_id,
                        text="Welcome to Telegram Drive Bot! 📁\nUse the web app to manage your files."
                    )
        
        return jsonify({'status': 'ok'})
    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({'status': 'error', 'message': str(e)})

def formatSize(size):
    for unit in ['B', 'KB', 'MB', 'GB']:
        if size < 1024:
            return f"{size:.2f} {unit}"
        size /= 1024
    return f"{size:.2f} TB"

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port) 