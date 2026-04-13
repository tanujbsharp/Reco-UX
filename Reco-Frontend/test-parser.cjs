const fs = require('fs');
const parser = require('@babel/parser');

const code = fs.readFileSync('/Users/tanujsadasivam/Desktop/Bsharp Reco/Design 20-Screen Customer Journey/src/app/screens/GuidedQuestionsScreen.tsx', 'utf-8');

try {
  parser.parse(code, {
    sourceType: 'module',
    plugins: ['jsx', 'typescript']
  });
  console.log('Success!');
} catch (e) {
  console.error(e);
}