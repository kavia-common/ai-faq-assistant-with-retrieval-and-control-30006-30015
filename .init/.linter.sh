#!/bin/bash
cd /home/kavia/workspace/code-generation/ai-faq-assistant-with-retrieval-and-control-30006-30015/faq_chatbox_frontend
npx eslint
ESLINT_EXIT_CODE=$?
npm run build
BUILD_EXIT_CODE=$?
if [ $ESLINT_EXIT_CODE -ne 0 ] || [ $BUILD_EXIT_CODE -ne 0 ]; then
   exit 1
fi

