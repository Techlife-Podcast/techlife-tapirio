#!/bin/zsh
# scripts/update-mp3urls-fromlist.sh 
# version 19
# create list by running "ls -1v" in the "e" folder on the server

echo "=============================================="
echo "Starting podcast feed URL update script"
echo "=============================================="

# Define paths
PUBLIC_DIR="../../public"
PODCAST_FEED="$PUBLIC_DIR/podcast-feed.xml"
BACKUP_FILE="$PUBLIC_DIR/podcast-feed.backup.xml"

echo "Using paths:"
echo "- Public directory: $PUBLIC_DIR"
echo "- Podcast feed: $PODCAST_FEED"

# Check if podcast feed exists
if [ ! -f "$PODCAST_FEED" ]; then
  echo "Error: podcast-feed.xml not found at $PODCAST_FEED"
  exit 1
fi

echo "Podcast feed exists and is $(wc -c < "$PODCAST_FEED") bytes"

# Create a backup
echo "Creating backup..."
cp "$PODCAST_FEED" "$BACKUP_FILE"
echo "Backup created at $BACKUP_FILE ($(wc -c < "$BACKUP_FILE") bytes)"

# Create temporary directory for processing
TEMP_DIR="$PUBLIC_DIR/temp_processing"
mkdir -p "$TEMP_DIR"
TEMP_FILE="$TEMP_DIR/podcast-feed.temp.xml"

echo "Step 1: Identifying URLs to update..."
# Extract all URLs from the feed for logging
grep -o 'url="https://www.techlifepodcast.com/Episodes/[^"]*"' "$PODCAST_FEED" > "$TEMP_DIR/old_urls.txt"
OLD_URL_COUNT=$(wc -l < "$TEMP_DIR/old_urls.txt")
echo "Found $OLD_URL_COUNT URLs to update"

echo "Step 2: Creating modified file..."

# Approach using two simple sed commands in sequence
# First copy the original file
cp "$PODCAST_FEED" "$TEMP_FILE"

# Then update the URLs - this handles the base URL change
echo "Updating base URL pattern..."
sed -i '' 's|https://www.techlifepodcast.com/Episodes/|https://media.techlifepodcast.com/e/|g' "$TEMP_FILE"

# Then update the filenames to lowercase - this specifically targets the filenames after the base URL
echo "Converting filenames to lowercase..."
# We'll get all the filenames that need to be updated
grep -o 'https://media.techlifepodcast.com/e/[^"]*' "$TEMP_FILE" > "$TEMP_DIR/filenames.txt"

# For each filename, we'll create a specific sed command to convert it to lowercase
while IFS= read -r url; do
  # Extract just the filename part (after the last /)
  filename=$(basename "$url")
  
  # Convert to lowercase
  lowercase_filename=$(echo "$filename" | tr '[:upper:]' '[:lower:]')
  
  # Only create a sed command if the lowercase version is different
  if [ "$filename" != "$lowercase_filename" ]; then
    echo "Converting $filename to $lowercase_filename"
    
    # Create and execute a sed command to update this specific filename
    sed -i '' "s|$filename|$lowercase_filename|g" "$TEMP_FILE"
  fi
done < "$TEMP_DIR/filenames.txt"

echo "Step 3: Verifying changes..."
# Check if the result looks good
if [ ! -s "$TEMP_FILE" ]; then
  echo "Error: Processing resulted in an empty file. Aborting."
  exit 1
fi

# Check that new URL pattern exists
grep -o 'url="https://media.techlifepodcast.com/e/[^"]*"' "$TEMP_FILE" > "$TEMP_DIR/new_urls.txt"
NEW_URL_COUNT=$(wc -l < "$TEMP_DIR/new_urls.txt")

if [ "$NEW_URL_COUNT" -gt 0 ]; then
  echo "Verification passed: Found $NEW_URL_COUNT URLs with the new pattern"
else
  echo "Warning: No URLs with the new pattern found. Something went wrong."
  exit 1
fi

echo "Step 4: Replacing original file..."
cp "$TEMP_FILE" "$PODCAST_FEED"
echo "Original file replaced with updated version"

# Create a simple log file
echo "Creating log file..."
LOG_FILE="update-mp3urls.log"
{
  echo "URL Update Summary"
  echo "----------------"
  echo "Date: $(date)"
  echo "URLs updated: $NEW_URL_COUNT"
  echo ""
  echo "Sample of updates:"
  paste "$TEMP_DIR/old_urls.txt" "$TEMP_DIR/new_urls.txt" | head -5
} > "$LOG_FILE"

# Clean up
echo "Cleaning up temporary files..."
rm -rf "$TEMP_DIR"
echo "Temporary files removed"

echo "=============================================="
echo "URL update complete!"
echo "- Updated $NEW_URL_COUNT URLs"
echo "- Original feed backed up to $BACKUP_FILE"
echo "- Log file created at $LOG_FILE"
echo "=============================================="

echo "To verify changes, run: diff -u \"$BACKUP_FILE\" \"$PODCAST_FEED\" | grep -A 2 -B 2 url="