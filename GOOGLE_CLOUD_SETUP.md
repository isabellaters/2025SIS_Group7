# Google Cloud Speech-to-Text Setup Guide

## Prerequisites
- Google Cloud account
- Google Cloud project with Speech-to-Text API enabled

## Authentication Setup

### Option 1: Application Default Credentials (Recommended)
1. Install Google Cloud CLI: https://cloud.google.com/sdk/docs/install
2. Run: `gcloud auth application-default login`
3. This will open a browser window for authentication

### Option 2: Service Account Key
1. Go to Google Cloud Console → IAM & Admin → Service Accounts
2. Create a new service account or use existing one
3. Grant "Cloud Speech-to-Text API User" role
4. Create and download a JSON key file
5. Set environment variable: `GOOGLE_APPLICATION_CREDENTIALS=path/to/key.json`

### Option 3: Environment Variable
Set the path to your service account key file:
```bash
export GOOGLE_APPLICATION_CREDENTIALS="path/to/your/service-account-key.json"
```

## Enable the API
1. Go to Google Cloud Console → APIs & Services → Library
2. Search for "Cloud Speech-to-Text API"
3. Click "Enable"

## Testing
Once authentication is set up, the app will automatically use Google Cloud Speech-to-Text instead of the mock service.

## Billing
Note: Google Cloud Speech-to-Text has usage-based pricing. Check the pricing page for current rates.
