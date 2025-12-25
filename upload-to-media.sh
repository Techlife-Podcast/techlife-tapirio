#!/bin/bash

# Upload file to media.techlifepodcast.com with public access
# Usage: ./upload-to-media.sh <file_path>

if [ $# -eq 0 ]; then
    echo "Usage: $0 <file_path>"
    exit 1
fi

FILE="$1"
BASENAME=$(basename "$FILE")

if [ ! -f "$FILE" ]; then
    echo "Error: File '$FILE' not found"
    exit 1
fi

echo "Uploading $BASENAME to media server..."

scp "$FILE" zork2:/tmp/ && \
ssh zork2 "sudo mv /tmp/$BASENAME /var/www/media.techlifepodcast.com/e/ && \
sudo chown www-data:www-data /var/www/media.techlifepodcast.com/e/$BASENAME && \
sudo chmod 644 /var/www/media.techlifepodcast.com/e/$BASENAME"

if [ $? -eq 0 ]; then
    echo "✓ Upload successful!"
    echo "URL: https://media.techlifepodcast.com/e/$BASENAME"
else
    echo "✗ Upload failed"
    exit 1
fi
