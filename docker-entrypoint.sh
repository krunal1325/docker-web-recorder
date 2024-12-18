#!/bin/sh
set -e

# Set default resolution if not provided
export RESOLUTION="${RESOLUTION:=1280x720}"

# Extract width and height from resolution
RESOLUTION_W=$(echo $RESOLUTION | cut -d'x' -f1)
RESOLUTION_H=$(echo $RESOLUTION | cut -d'x' -f2)

# Set default DISPLAY if not already set
export DISPLAY="${DISPLAY:=:99}"

# Start PulseAudio if not already running
if ! pulseaudio --check; then
    echo "Starting PulseAudio..."
    pulseaudio -D > /tmp/pulseaudio.log 2>&1
else
    echo "PulseAudio is already running."
fi

# Start Xvfb
echo "Starting Xvfb on display $DISPLAY with resolution ${RESOLUTION_W}x${RESOLUTION_H}x24..."
Xvfb $DISPLAY -screen 0 "${RESOLUTION_W}x${RESOLUTION_H}x24" > /tmp/xvfb.log 2>&1 &

# Wait for Xvfb to initialize
sleep 2

# Check if Xvfb is running
if ! pgrep -x "Xvfb" > /dev/null; then
    echo "Error: Xvfb failed to start. Check /tmp/xvfb.log for details."
    cat /tmp/xvfb.log
    exit 1
fi

# Check if PulseAudio is running
if ! pulseaudio --check; then
    echo "Error: PulseAudio failed to start. Check /tmp/pulseaudio.log for details."
    cat /tmp/pulseaudio.log
    exit 1
fi

# Log the DISPLAY variable
echo "Using DISPLAY: $DISPLAY"

# Execute the provided command
exec "$@"
