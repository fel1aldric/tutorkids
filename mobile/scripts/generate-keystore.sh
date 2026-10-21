#!/usr/bin/env bash
# Generate an Android signing keystore for TutorKids.
# Run once locally, then upload the keystore and credentials to Codemagic secrets.
set -e

KEYSTORE_FILE="tutorkids-release.keystore"
KEY_ALIAS="tutorkids"
KEYSTORE_PASSWORD="$(openssl rand -base64 24)"
KEY_PASSWORD="$KEYSTORE_PASSWORD"
VALIDITY_DAYS=10000

rm -f "$KEYSTORE_FILE"

keytool -genkeypair \
  -v \
  -keystore "$KEYSTORE_FILE" \
  -alias "$KEY_ALIAS" \
  -keyalg RSA \
  -keysize 2048 \
  -validity "$VALIDITY_DAYS" \
  -storepass "$KEYSTORE_PASSWORD" \
  -keypass "$KEY_PASSWORD" \
  -dname "CN=TutorKids, OU=Mobile, O=TutorKids, L=Paris, ST=France, C=FR"

echo ""
echo "Keystore generated: $KEYSTORE_FILE"
echo "Keystore password : $KEYSTORE_PASSWORD"
echo "Key alias       : $KEY_ALIAS"
echo "Key password    : $KEY_PASSWORD"
echo ""
echo "Save these values in Codemagic as encrypted environment variables:"
echo "  ANDROID_KEYSTORE_PASSWORD = $KEYSTORE_PASSWORD"
echo "  ANDROID_KEY_PASSWORD      = $KEY_PASSWORD"
echo "  ANDROID_KEY_ALIAS         = $KEY_ALIAS"
echo ""
echo "Upload the keystore file to Codemagic as an Android signing file named 'tutorkids_keystore'."
echo "For local storage, keep this file in a secure password manager — do not commit it."
