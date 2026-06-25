const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

let count = 0;
walkDir('src', function(filePath) {
  if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
    let content = fs.readFileSync(filePath, 'utf8');
    if (content.includes("from 'firebase/firestore'") || content.includes('from "firebase/firestore"')) {
      let newContent = content.replace(/from ['"]firebase\/firestore['"]/g, "from '@/src/firebase/firestore-compat'");
      fs.writeFileSync(filePath, newContent, 'utf8');
      count++;
    }
  }
});
console.log('Updated ' + count + ' files.');
