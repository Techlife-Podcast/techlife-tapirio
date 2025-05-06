#!/bin/zsh
# scripts/update-mp3urls-fromlist.sh 
# create list by running "ls -1v" in the "e" folder on the server

# Turn off command echo to make output cleaner
set +x

echo "==============================================="
echo "Starting podcast feed URL update script"
echo "==============================================="

# Determine paths
SCRIPT_DIR="$(pwd)"
PUBLIC_DIR="$SCRIPT_DIR/../../public"
PODCAST_FEED="$PUBLIC_DIR/podcast-feed.xml"
BACKUP_FILE="$PUBLIC_DIR/podcast-feed.xml.backup"

echo "Using paths:"
echo "- Script directory: $SCRIPT_DIR"
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

# Step 1: Replace URLs using temporary file
echo "Step 1: Replacing old URLs with new pattern..."
TEMP_FILE1="$PUBLIC_DIR/temp1.xml"
echo "Creating temporary file at $TEMP_FILE1"

# Use basic sed command to update the URLs
sed 's|https://www.techlifepodcast.com/Episodes/|https://media.techlifepodcast.com/e/|g' "$PODCAST_FEED" > "$TEMP_FILE1"
echo "Basic replacement complete"

# Step 2: Convert filenames to lowercase
echo "Step 2: Converting filenames to lowercase..."
TEMP_FILE2="$PUBLIC_DIR/temp2.xml"

# Mac-specific version of sed to handle lowercase conversion
sed 's|techlifepodcast.com/e/Techlife|techlifepodcast.com/e/techlife|g' "$TEMP_FILE1" > "$TEMP_FILE2"
echo "Lowercase conversion complete"

# Step 3: Replace the original file
echo "Step 3: Replacing the original file..."
cp "$TEMP_FILE2" "$PODCAST_FEED"
echo "Original file replaced with updated version"

# Create a simple log of what was done
echo "Creating log file..."
LOG_FILE="$SCRIPT_DIR/update_log.txt"
echo "Log file will be at $LOG_FILE"

echo "URL Update Summary" > "$LOG_FILE"
echo "----------------" >> "$LOG_FILE"
echo "Date: $(date)" >> "$LOG_FILE"
echo "Changed URLs from pattern:" >> "$LOG_FILE"
echo "  https://www.techlifepodcast.com/Episodes/" >> "$LOG_FILE"
echo "To pattern:" >> "$LOG_FILE"
echo "  https://media.techlifepodcast.com/e/" >> "$LOG_FILE"
echo "" >> "$LOG_FILE"

# Count the number of URLs changed
OLD_COUNT=$(grep -c "techlifepodcast.com/Episodes/" "$BACKUP_FILE" || echo 0)
NEW_COUNT=$(grep -c "techlifepodcast.com/e/" "$PODCAST_FEED" || echo 0)

echo "URL counts:" >> "$LOG_FILE"
echo "- URLs with old pattern in original file: $OLD_COUNT" >> "$LOG_FILE"
echo "- URLs with new pattern in updated file: $NEW_COUNT" >> "$LOG_FILE"

# Clean up
echo "Cleaning up temporary files..."
rm -f "$TEMP_FILE1" "$TEMP_FILE2"
echo "Temporary files removed"

echo "==============================================="
echo "URL update complete!"
echo "- Changed approximately $OLD_COUNT URLs"
echo "- Original feed backed up to $BACKUP_FILE"
echo "- Log file created at $LOG_FILE"
echo "==============================================="

echo "To verify changes, run: diff -u \"$BACKUP_FILE\" \"$PODCAST_FEED\" | grep -A 2 -B 2 enclosure"