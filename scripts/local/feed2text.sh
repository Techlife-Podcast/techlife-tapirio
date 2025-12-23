#!/bin/zsh

# Set default paths
DEFAULT_FEED_PATH="../../public/podcast-feed.xml"
DEFAULT_OUTPUT_NAME="feed-as-text.txt"

# Prompt user to confirm or change the feed file
echo "Do you want to process this RSS feed: $DEFAULT_FEED_PATH? (y/n)"
read CONFIRM

if [[ "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]]; then
    echo "Please enter the relative path to the RSS feed file:"
    read RSS_PATH
else
    RSS_PATH=$DEFAULT_FEED_PATH
fi

# Validate the RSS file exists
if [[ ! -f $RSS_PATH ]]; then
    echo "Error: File '$RSS_PATH' not found."
    exit 1
fi

# Set the output path to be in the same directory as the input file
OUTPUT_DIR=$(dirname "$RSS_PATH")
OUTPUT_PATH="$OUTPUT_DIR/$DEFAULT_OUTPUT_NAME"

echo "RSS feed will be processed and output to: $OUTPUT_PATH"
echo "Continue? (y/n)"
read CONFIRM

if [[ "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]]; then
    echo "Operation cancelled."
    exit 0
fi

# Create a temporary directory
TEMP_DIR=$(mktemp -d)
TEMP_FILE="$TEMP_DIR/temp.txt"

# Start building the output
echo "# Технологии и жизнь - подкаст" > "$OUTPUT_PATH"
echo "Подкаст о современной жизни, философии, и путешествиях с технологической, космополитической, и контркультурной точек зрения." >> "$OUTPUT_PATH"
echo "Ведущие: Дмитрий Здоров и Василий Мязин" >> "$OUTPUT_PATH"
echo "" >> "$OUTPUT_PATH"

# Create a simpler approach - extract each item as a whole chunk
echo "Extracting items from RSS feed..."

# Extract all items into separate files
grep -n "<item>" "$RSS_PATH" | while read -r ITEM_START; do
    START_LINE=${ITEM_START%%:*}
    
    # Get the end line number for this item
    END_LINE_INFO=$(tail -n +$START_LINE "$RSS_PATH" | grep -n "</item>" | head -1)
    if [[ -z "$END_LINE_INFO" ]]; then
        continue  # Skip if we can't find the end of the item
    fi
    
    END_LINE_RELATIVE=${END_LINE_INFO%%:*}
    END_LINE=$((START_LINE + END_LINE_RELATIVE - 1))
    
    # Create a file with just this item
    ITEM_FILE="$TEMP_DIR/item_$START_LINE.xml"
    sed -n "${START_LINE},${END_LINE}p" "$RSS_PATH" > "$ITEM_FILE"
    
    # Process the item
    # Extract title
    TITLE=$(grep -o '<title>[^<]*</title>' "$ITEM_FILE" | head -1 | sed 's/<title>\(.*\)<\/title>/\1/')
    if [[ -z "$TITLE" ]]; then
        continue  # Skip if no title found
    fi
    
    echo "Processing: $TITLE"
    
    # Extract publication date
    PUBDATE=$(grep -o '<pubDate>[^<]*</pubDate>' "$ITEM_FILE" | head -1 | sed 's/<pubDate>\(.*\)<\/pubDate>/\1/')
    
    # Extract description content
    CONTENT_FILE="$TEMP_DIR/content.txt"
    
    # Try to extract content from content:encoded first
    CONTENT=$(grep -A 1000 '<content:encoded>' "$ITEM_FILE" | grep -B 1000 '</content:encoded>' | 
              sed 's/<content:encoded><!\[CDATA\[//' | 
              sed 's/\]\]><\/content:encoded>//')
    
    # If no content found, try description
    if [[ -z "$CONTENT" ]]; then
        CONTENT=$(grep -A 1000 '<description>' "$ITEM_FILE" | grep -B 1000 '</description>' | 
                 sed 's/<description><!\[CDATA\[//' | 
                 sed 's/\]\]><\/description>//')
    fi
    
    # Save content to file for easier processing
    echo "$CONTENT" > "$CONTENT_FILE"
    
    # Extract paragraphs
    PARAGRAPHS_FILE="$TEMP_DIR/paragraphs.txt"
    grep -o '<p>[^<]*</p>' "$CONTENT_FILE" | 
        sed 's/<p>\(.*\)<\/p>/\1/' | 
        grep -v '^<img' | 
        grep -v 'наш подкаст в директории' | 
        grep -v 'Наш канал на Youtube' > "$PARAGRAPHS_FILE"
    
    # Write the episode title and date
    echo "## $TITLE ($PUBDATE)" >> "$OUTPUT_PATH"
    
    # Write paragraphs
    if [[ -s "$PARAGRAPHS_FILE" ]]; then
        cat "$PARAGRAPHS_FILE" >> "$OUTPUT_PATH"
    else
        echo "Описание недоступно" >> "$OUTPUT_PATH"
    fi
    
    # Extract list items properly
    LINKS_FILE="$TEMP_DIR/links.txt"
    
    # Process to extract list items correctly
    grep -o '<li>.*</li>' "$CONTENT_FILE" | 
        sed 's/<li>/\* /g' | 
        sed 's/<\/li>//g' | 
        sed 's/<[^>]*>//g' > "$LINKS_FILE"
    
    # Add links if we found any
    if [[ -s "$LINKS_FILE" ]]; then
        echo "" >> "$OUTPUT_PATH"  # Add a blank line before links
        cat "$LINKS_FILE" >> "$OUTPUT_PATH"
    fi
    
    echo "" >> "$OUTPUT_PATH"  # Add a blank line after each item
done

# Clean up
rm -rf "$TEMP_DIR"

echo "RSS feed processing complete."
echo "Output saved to: $OUTPUT_PATH"