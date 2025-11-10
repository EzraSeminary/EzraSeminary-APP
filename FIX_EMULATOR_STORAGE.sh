#!/bin/bash

# Fix Android Emulator INSTALL_FAILED_INSUFFICIENT_STORAGE
# This script helps you fix the emulator storage issue

echo "=========================================="
echo "Android Emulator Storage Fix"
echo "=========================================="
echo ""

# Check if emulator command exists
if ! command -v emulator &> /dev/null; then
    echo "❌ Android emulator command not found"
    echo "Please set ANDROID_HOME and add \$ANDROID_HOME/emulator to PATH"
    exit 1
fi

# List available AVDs
echo "Available Android Virtual Devices:"
echo ""
emulator -list-avds
echo ""

# Prompt for AVD name
read -p "Enter the AVD name you want to fix (e.g., Pixel_2_API_28): " AVD_NAME

if [ -z "$AVD_NAME" ]; then
    echo "❌ No AVD name provided"
    exit 1
fi

# Check if AVD exists
if ! emulator -list-avds | grep -q "^${AVD_NAME}$"; then
    echo "❌ AVD '${AVD_NAME}' not found"
    exit 1
fi

echo ""
echo "Choose a fix option:"
echo "1) Wipe emulator data (fastest, deletes all app data)"
echo "2) Cold boot with wipe (thorough clean)"
echo "3) Just show AVD info (no changes)"
echo ""
read -p "Enter choice (1-3): " CHOICE

case $CHOICE in
    1)
        echo ""
        echo "🗑️  Wiping data for ${AVD_NAME}..."
        emulator -avd "$AVD_NAME" -wipe-data &
        echo ""
        echo "✅ Emulator started with wiped data"
        echo "   Wait for emulator to fully boot, then run:"
        echo "   npx react-native run-android"
        ;;
    2)
        echo ""
        echo "🗑️  Cold booting ${AVD_NAME} with data wipe..."
        emulator -avd "$AVD_NAME" -no-snapshot-load -wipe-data &
        echo ""
        echo "✅ Emulator started with cold boot and wiped data"
        echo "   This may take longer to boot"
        ;;
    3)
        echo ""
        echo "📊 AVD Info for ${AVD_NAME}:"
        echo ""
        AVD_PATH="$HOME/.android/avd/${AVD_NAME}.avd"
        if [ -d "$AVD_PATH" ]; then
            echo "AVD Path: $AVD_PATH"
            echo ""
            if [ -f "$AVD_PATH/config.ini" ]; then
                echo "Current Configuration:"
                grep -E "(disk.dataPartition.size|hw.ramSize)" "$AVD_PATH/config.ini" || echo "No size info found"
            fi
            echo ""
            echo "To manually increase storage:"
            echo "1. Open Android Studio"
            echo "2. Tools → AVD Manager"
            echo "3. Click Edit (pencil icon) on ${AVD_NAME}"
            echo "4. Show Advanced Settings"
            echo "5. Set Internal Storage to 4096 MB or 8192 MB"
            echo "6. Click Finish"
        else
            echo "AVD path not found at: $AVD_PATH"
        fi
        ;;
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "=========================================="
echo "Alternatively, create a NEW emulator:"
echo "=========================================="
echo "1. Open Android Studio"
echo "2. Tools → Device Manager"
echo "3. Create Device"
echo "4. Choose Pixel 5 or newer"
echo "5. Select API 30 or higher (with Google APIs)"
echo "6. Advanced Settings → Internal Storage: 8192 MB"
echo "7. RAM: 2048 MB or higher"
echo "8. Click Finish"
echo ""

