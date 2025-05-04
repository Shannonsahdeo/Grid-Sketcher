const imageUploader = document.getElementById("imageUploader");
const paperSize = document.getElementById("paperSize");
const customSizeInputs = document.getElementById("customSizeInputs");
const customWidth = document.getElementById("customWidth");
const customHeight = document.getElementById("customHeight");
const canvas = document.getElementById("drawingCanvas");
const ctx = canvas.getContext("2d");

let img = new Image();
let gridWidth = 21;
let gridHeight = 29.7;

paperSize.addEventListener("change", () => {
  if (paperSize.value === "custom") {
    customSizeInputs.style.display = "block";
  } else {
    customSizeInputs.style.display = "none";
    if (paperSize.value === "A4") {
      gridWidth = 21;
      gridHeight = 29.7;
    } else if (paperSize.value === "A3") {
      gridWidth = 29.7;
      gridHeight = 42;
    }
    draw();
  }
});

customWidth.addEventListener("input", updateCustomSize);
customHeight.addEventListener("input", updateCustomSize);

function updateCustomSize() {
  gridWidth = parseFloat(customWidth.value) || 0;
  gridHeight = parseFloat(customHeight.value) || 0;
  draw();
}

imageUploader.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    img.onload = () => draw();
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
});

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!img.src) return;

  // darwing the base image with reduced opacity
  ctx.save();
  ctx.globalAlpha = 0.3;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  ctx.restore();

  // generating edge detection from image (in memory)
  const offCanvas = document.createElement("canvas");
  offCanvas.width = canvas.width;
  offCanvas.height = canvas.height;
  const offCtx = offCanvas.getContext("2d");
  offCtx.drawImage(img, 0, 0, canvas.width, canvas.height);

  let imageData = offCtx.getImageData(0, 0, canvas.width, canvas.height);
  let data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;
  const output = new Uint8ClampedArray(data.length);

  // Grayscale
  for (let i = 0; i < data.length; i += 4) {
    const avg = 0.3 * data[i] + 0.59 * data[i + 1] + 0.11 * data[i + 2];
    data[i] = data[i + 1] = data[i + 2] = avg;
  }

  function getGray(x, y) {
    const i = (y * width + x) * 4;
    return data[i];
  }

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4; 
      const gx =
        -1 * getGray(x - 1, y - 1) + 1 * getGray(x + 1, y - 1) +
        -2 * getGray(x - 1, y) + 2 * getGray(x + 1, y) +
        -1 * getGray(x - 1, y + 1) + 1 * getGray(x + 1, y + 1);

      const gy =
        -1 * getGray(x - 1, y - 1) + -2 * getGray(x, y - 1) + -1 * getGray(x + 1, y - 1) +
         1 * getGray(x - 1, y + 1) + 2 * getGray(x, y + 1) + 1 * getGray(x + 1, y + 1);

      const magnitude = Math.sqrt(gx * gx + gy * gy);
      if (magnitude > 60) {
        // Draw edge: black
        output[idx] = output[idx + 1] = output[idx + 2] = 0;
        output[idx + 3] = 255; // fully opaque
      } else {
        // Transparent: no edge
        output[idx] = output[idx + 1] = output[idx + 2] = 0;
        output[idx + 3] = 0; // fully transparent
      }
      
    }
  }

  // drawing edges on top of image
  ctx.putImageData(new ImageData(output, width, height), 0, 0);

  // drawng the grid on top
  const cmToPx = canvas.width / gridWidth;
  ctx.strokeStyle = "#cccccc";
  for (let x = 0; x <= canvas.width; x += cmToPx) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y <= canvas.height; y += cmToPx) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
}

// Coordinate tools
canvas.addEventListener("mousemove", (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  const cmToPx = canvas.width / gridWidth;
  const xCm = (x / cmToPx).toFixed(1);
  const yCm = (y / cmToPx).toFixed(1);
  canvas.title = `${xCm}cm from left, ${yCm}cm from top`;
});

// Download grid image
const downloadBtn = document.getElementById("downloadBtn");
downloadBtn.addEventListener("click", () => {
  const image = canvas.toDataURL("image/png");
  const link = document.createElement("a");
  link.download = "sketch-grid.png";
  link.href = image;
  link.click();
});
