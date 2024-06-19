const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

function countKeywords(resumeText, keywords) {
  resumeText = resumeText.toLowerCase();
  keywords = keywords.map(keyword => keyword.toLowerCase().trim());

  const keywordCounts = keywords.reduce((counts, keyword) => {
    const regex = new RegExp(`\\b${keyword}\\b`, 'g');
    const matches = resumeText.match(regex);
    counts[keyword] = matches ? matches.length : 0;
    return counts;
  }, {});

  const totalCount = Object.values(keywordCounts).reduce((sum, count) => sum + count, 0);
  return { keywordCounts, totalCount };
}

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/upload', upload.single('resume'), (req, res) => {
  const keywords = req.body.keywords.split(',').map(k => k.trim());
  const resumePath = path.join(__dirname, req.file.path);
  const resumeExtension = path.extname(req.file.originalname).toLowerCase();

  const readFileContent = () => {
    return new Promise((resolve, reject) => {
      if (resumeExtension === '.pdf') {
        const dataBuffer = fs.readFileSync(resumePath);
        pdfParse(dataBuffer).then(data => {
          resolve(data.text);
        }).catch(err => {
          reject(err);
        });
      } else {
        fs.readFile(resumePath, 'utf8', (err, text) => {
          if (err) {
            reject(err);
          } else {
            resolve(text);
          }
        });
      }
    });
  };

  readFileContent()
    .then(resumeText => {
      const { keywordCounts, totalCount } = countKeywords(resumeText, keywords);
      fs.unlink(resumePath, () => {}); // Clean up the uploaded file
      res.json({ keywordCounts, totalCount });
    })
    .catch(err => {
      res.status(500).json({ error: 'Failed to process resume file.' });
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});