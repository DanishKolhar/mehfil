const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8085;
const PUBLIC_DIR = 'c:\\Users\\danis\\Desktop\\mehfil\\frontend\\public';

const svgContent = fs.readFileSync(path.join(PUBLIC_DIR, 'favicon.svg'), 'utf8');

const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <title>Render Favicon</title>
</head>
<body>
  <div id="svg-container" style="display: none;">
    ${svgContent}
  </div>
  <canvas id="canvas32" width="32" height="32"></canvas>
  <script>
    window.onload = function() {
      const svgElement = document.querySelector('svg');
      svgElement.setAttribute('width', '100');
      svgElement.setAttribute('height', '100');
      
      const svgString = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([svgString], {type: 'image/svg+xml;charset=utf-8'});
      const URL = window.URL || window.webkitURL || window;
      const blobURL = URL.createObjectURL(svgBlob);
      
      const image = new Image();
      image.onload = function() {
        const canvas = document.getElementById('canvas32');
        const context = canvas.getContext('2d');
        context.clearRect(0, 0, 32, 32);
        context.drawImage(image, 0, 0, 32, 32);
        
        const dataUrl = canvas.toDataURL('image/png');
        const base64Png = dataUrl.replace(/^data:image\\/png;base64,/, '');
        
        fetch('/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ png: base64Png })
        }).then(res => {
          document.body.innerHTML = '<h1>Favicon Rendered and Saved!</h1>';
        }).catch(err => {
          document.body.innerHTML = '<h1>Error: ' + err.message + '</h1>';
        });
      };
      image.src = blobURL;
    };
  </script>
</body>
</html>
`;

function makeIco(pngBuffer) {
  const header = Buffer.alloc(22);
  
  // Header
  header.writeUInt16LE(0, 0);     // Reserved
  header.writeUInt16LE(1, 2);     // Image type (1 = ICO)
  header.writeUInt16LE(1, 4);     // Number of images
  
  // Directory entry
  header.writeUInt8(32, 6);       // Width (32)
  header.writeUInt8(32, 7);       // Height (32)
  header.writeUInt8(0, 8);        // Color count (0)
  header.writeUInt8(0, 9);        // Reserved
  header.writeUInt16LE(1, 10);    // Color planes (1)
  header.writeUInt16LE(32, 12);   // Bits per pixel (32)
  header.writeUInt32LE(pngBuffer.length, 14); // Size of image data
  header.writeUInt32LE(22, 18);   // Offset to image data
  
  return Buffer.concat([header, pngBuffer]);
}

const server = http.createServer((req, res) => {
  if (req.url === '/' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(htmlContent);
  } else if (req.url === '/save' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const pngBuffer = Buffer.from(payload.png, 'base64');
        
        // Save PNG
        fs.writeFileSync(path.join(PUBLIC_DIR, 'favicon.png'), pngBuffer);
        console.log('Saved favicon.png successfully.');
        
        // Save ICO
        const icoBuffer = makeIco(pngBuffer);
        fs.writeFileSync(path.join(PUBLIC_DIR, 'favicon.ico'), icoBuffer);
        console.log('Saved favicon.ico successfully.');
        
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('OK');
        
        setTimeout(() => {
          console.log('Shutting down server.');
          server.close(() => {
            process.exit(0);
          });
        }, 1000);
      } catch (err) {
        console.error(err);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Error: ' + err.message);
      }
    });
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

server.listen(PORT, () => {
  console.log(`Favicon generator server listening on port ${PORT}`);
});
