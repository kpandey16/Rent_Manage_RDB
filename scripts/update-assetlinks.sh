#!/bin/bash

# Script to update assetlinks.json with your SHA-256 fingerprint

echo "This script will help you update assetlinks.json"
echo ""
echo "First, run this command in your Android project directory:"
echo "keytool -list -v -keystore release-key.jks -alias rent-manage"
echo ""
echo "Copy the SHA256 fingerprint (without colons)"
echo ""
read -p "Enter your SHA-256 fingerprint: " FINGERPRINT
read -p "Enter your package name (e.g., com.rentmanage.app): " PACKAGE_NAME

# Remove any colons or spaces from fingerprint
FINGERPRINT=$(echo $FINGERPRINT | tr -d ':' | tr -d ' ')

# Create assetlinks.json
cat > public/.well-known/assetlinks.json <<EOF
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "$PACKAGE_NAME",
    "sha256_cert_fingerprints": [
      "$FINGERPRINT"
    ]
  }
}]
EOF

echo ""
echo "✓ assetlinks.json has been updated!"
echo "✓ File location: public/.well-known/assetlinks.json"
echo ""
echo "Next steps:"
echo "1. Commit and push these changes"
echo "2. Deploy to production"
echo "3. Verify at: https://your-domain.com/.well-known/assetlinks.json"
