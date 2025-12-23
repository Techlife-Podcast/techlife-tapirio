#!/bin/bash

# Automated Responsive Screenshot Testing Script
# Usage: ./scripts/run-screenshot-tests.sh [mode]
# Modes: basic, full, analysis

set -e

MODE=${1:-basic}
PROJECT_ROOT=$(pwd)

echo "🚀 Starting Responsive Screenshot Testing"
echo "Mode: $MODE"
echo "Project: $PROJECT_ROOT"
echo "Note: Each run creates a unique timestamped folder (no overwriting)"

# Ensure screenshot directory exists
mkdir -p test-results/screenshots

case $MODE in
  "basic")
    echo "📱 Running basic responsive screenshot tests (timestamped)..."
    npm run screenshots -- --reporter=line
    ;;
    
  "full")
    echo "📸 Running full screenshot test suite (timestamped)..."
    npm run screenshots
    echo "📊 Generating analysis report for latest run..."
    npm run screenshots:analyze
    ;;
    
  "analysis")
    echo "📊 Running screenshot analysis (latest run only)..."
    npm run screenshots:analyze
    ;;
    
  "analysis-all")
    echo "📊 Running screenshot analysis (all runs)..."
    npm run screenshots:analyze-all
    ;;
    
  "ui")
    echo "🖥️ Opening Playwright UI..."
    npm run screenshots:ui
    ;;
    
  *)
    echo "Usage: $0 [mode]"
    echo "Modes:"
    echo "  basic        - Run screenshot tests with minimal output"
    echo "  full         - Run tests + generate analysis report (latest run)"
    echo "  analysis     - Generate analysis report (latest run only)"
    echo "  analysis-all - Generate analysis report (all runs)"
    echo "  ui           - Open Playwright UI"
    exit 1
    ;;
esac

# Show results summary
if [ -d "test-results/screenshots" ]; then
  SCREENSHOT_COUNT=$(find test-results/screenshots -name "*.png" | wc -l | tr -d ' ')
  echo "✅ Complete! $SCREENSHOT_COUNT screenshots captured."
  echo "📁 Screenshots saved to: test-results/screenshots/"
  
  if [ -f "test-results/screenshots/analysis-report.html" ]; then
    echo "📄 Analysis report: test-results/screenshots/analysis-report.html"
  fi
fi

echo "🎉 Screenshot testing complete!"