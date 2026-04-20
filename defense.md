# Introduction to Computer Vision — Defense Guide
**ESIN, UIR — Spring 2026 | Instructor: Ilias TOUGUI**

---

## How the Defense Works

Each group presents their project. During the defense, each student draws **one card** from a tombola of 4 choices:

| Card | What it means |
|------|---------------|
| **Code** (×2) | Student must open the notebook and walk through a specific implementation |
| **Concept** (×2) | Student must explain and discuss the theory behind a chosen topic |

After the card is drawn, you pick **one question** from the relevant section below (or improvise based on their answer). The hint lines are for your eyes only — they capture the key ideas a solid answer should include.

---

## Grading Reminders

| Project | Difficulty | Max Mark |
|---------|-----------|----------|
| Project 1 — Document Scanner | Accessible | 16/20 |
| Project 2 — Instagram-Style Filters | Accessible | 16/20 |
| Project 3 — Barcode & QR Code Scanner | Intermediate | 18/20 |
| Project 4 — Panorama Stitcher | Intermediate | 18/20 |
| Project 5 — License Plate Deblurring | Challenging | 20/20 |

A perfect submission of a harder project always outscores a perfect one of an easier project.

---

## Defense Walkthrough — Per Project

---

### Project 1 — Document Scanner *(Accessible | Max: 16/20)*

**What to check at the start (2 min)**
- Ask the group to run their notebook end-to-end on one image.
- Verify the pipeline produces a top-down warped document with enhancement.
- Glance at code organisation: functions, docstrings, comments.

---

#### Code Questions

> Ask the student to open the notebook and navigate to the relevant function before answering.

**Q1 — Preprocessing**
> "Show me your preprocessing function. Why did you choose those specific Gaussian kernel parameters?"

*Hint: Look for kernel size and sigma choice; understanding that larger σ removes more noise but also more detail; trade-off with edge sharpness.*

**Q2 — Edge detection**
> "Walk me through your Canny call. What do the two threshold values control, and how did you pick them?"

*Hint: Low/high thresholds for hysteresis; weak edges kept only if connected to strong ones; ratio ~1:2 or 1:3; effect of wrong values on false/missed edges.*

**Q3 — Contour selection**
> "Show me the function where you find the document contour. How do you ensure you're selecting the document and not some background object?"

*Hint: Sort contours by area descending; `approxPolyDP` with epsilon as % of perimeter; check for exactly 4 vertices; possibly convex hull fallback.*

**Q4 — Corner ordering**
> "Show me how you order the four corners. What happens if they come back in the wrong order?"

*Hint: Sum trick: TL = min sum, BR = max sum; Diff trick: TR = min diff, BL = max diff. Wrong order → cross-warped output.*

**Q5 — Perspective transform**
> "How did you calculate the output dimensions of the warped image? Walk me through that calculation."

*Hint: Euclidean distance between corresponding corners to get width and height; `cv2.getPerspectiveTransform` + `cv2.warpPerspective`.*

---

#### Concept Questions

**Q1 — Perspective transform**
> "What is a perspective transform mathematically? Why do we need a 3×3 matrix and not a 2×3 one like an affine transform?"

*Hint: Projective geometry; homogeneous coordinates; 3×3 encodes vanishing points; affine is a special case (last row = [0,0,1]); 4 point correspondences = 8 DOF.*

**Q2 — Affine vs perspective**
> "What is the difference between an affine and a perspective transform? Give a real-world example of each."

*Hint: Affine preserves parallelism and ratios (rotation, scaling, shear); perspective doesn't — introduces vanishing points (photo of a document on a table).*

**Q3 — Why blur before Canny?**
> "Why do we apply Gaussian blur before running Canny? What would happen if we skipped it?"

*Hint: Gradient computation amplifies noise (small pixel differences become large derivatives); false edge responses; NMS and hysteresis cannot clean up noise-driven edges.*

**Q4 — Sobel inside Canny**
> "What does the Sobel operator compute inside Canny? Why can't we replace it with a Laplacian?"

*Hint: Sobel gives gradient magnitude AND direction; direction is needed for non-maximum suppression; Laplacian is isotropic but has no orientation — can't do NMS.*

**Q5 — Histogram equalisation**
> "Explain how histogram equalisation works. What are its limitations when applied to a scanned document?"

*Hint: Maps pixel values via CDF to spread histogram; enhances contrast globally; limitation: over-brightens already-clear regions, amplifies background noise; CLAHE works locally.*

---

---

### Project 2 — Instagram-Style Filters *(Accessible | Max: 16/20)*

**What to check at the start (2 min)**
- Ask the group to demo at least 3 different filters live (blur/sharpen, bilateral, sketch or vignette).
- Verify the interactive interface works (ipywidgets or GUI).
- Check that filters are in distinct named functions.

---

#### Code Questions

**Q1 — 2D convolution**
> "Show me your custom 2D convolution implementation. How did you handle the pixels at the image border?"

*Hint: Zero-padding, reflect, or replicate border mode; sliding window or vectorised approach; trade-off between modes.*

**Q2 — Bilateral filter**
> "Walk me through your bilateral filter code. How is the range kernel different from the spatial kernel?"

*Hint: Spatial = Gaussian over pixel distance; range = Gaussian over intensity difference; both multiplied per pixel; normalised by sum of weights; preserves edges because cross-edge pixels have low range weight.*

**Q3 — Vignette**
> "Show me how you create the vignette mask. How do you blend it with the original image?"

*Hint: Distance from centre → Gaussian or power function → mask in [0,1]; multiply elementwise with image; dark falloff toward corners.*

**Q4 — Pencil sketch**
> "Walk me through your pencil sketch pipeline step by step."

*Hint: Grayscale → Gaussian blur → edge detection (Canny or gradient magnitude) → invert; optionally dodge blend on a lightened copy.*

**Q5 — Sepia / LUT**
> "Show me your colour transformation for the sepia or custom LUT filter. How does it shift the colour of the image?"

*Hint: Matrix applied to RGB channels; sepia matrix boosts red/green, suppresses blue; LUT maps each intensity value to a new one per channel.*

---

#### Concept Questions

**Q1 — Linear vs non-linear**
> "What is the fundamental mathematical difference between a linear filter and a median filter? When would you prefer each one?"

*Hint: Linear = weighted sum of neighbours (superposition holds); median = rank-order statistic (nonlinear). Median removes salt-and-pepper noise without blurring; Gaussian better for Gaussian noise.*

**Q2 — Why bilateral preserves edges**
> "Explain intuitively why the bilateral filter preserves edges while a Gaussian blur does not."

*Hint: Gaussian averages across all neighbours; bilateral weights by both spatial distance AND intensity similarity, so pixels across an edge (large intensity difference) get near-zero weight.*

**Q3 — Separability**
> "What does it mean for a filter to be separable? Why does it matter for performance?"

*Hint: 2D kernel = outer product of two 1D kernels; apply row-wise then column-wise; O(n²) per pixel → O(2n); Gaussian is separable, arbitrary kernels are not.*

**Q4 — Convolution theorem**
> "What is the convolution theorem? How could you use it to speed up applying a large kernel?"

*Hint: Convolution in spatial domain ↔ pointwise multiplication in frequency domain; FFT of image × FFT of kernel → IFFT; faster for large kernels (FFT is O(N log N)).*

**Q5 — Colour space for brightness filter**
> "If you want to adjust brightness without changing colour, which colour space would you use, and why not RGB?"

*Hint: HSV (V channel) or LAB (L channel) separate luminance from chrominance; adjusting R/G/B together shifts brightness but also changes hue; HSV/LAB isolates luminance cleanly.*

---

---

### Project 3 — Barcode & QR Code Scanner *(Intermediate | Max: 18/20)*

**What to check at the start (2 min)**
- Ask the group to run the GUI/notebook on an image containing at least one QR code and one barcode.
- Verify bounding boxes are drawn and decoded text is displayed.
- Ask briefly: "Did you implement detection from scratch or use a library?" — adjust code questions accordingly.

---

#### Code Questions

**Q1 — Detection pipeline**
> "Show me the function that detects and localises a code in the image. Walk me through each step."

*Hint: Grayscale → blur → threshold or edge detection → contour finding → filter by shape/aspect ratio → bounding box or quadrilateral.*

**Q2 — Distinguishing QR from barcode**
> "How does your code tell the difference between a QR code region and a barcode region?"

*Hint: Aspect ratio (barcodes are wide/rectangular, QR is square); gradient consistency (barcode has mainly horizontal gradients); finder pattern structure; library flag if using pyzbar.*

**Q3 — Localisation**
> "Show me how you draw the bounding box or quadrilateral around the detected code. How precise is it?"

*Hint: `cv2.boundingRect` vs `cv2.minAreaRect` vs `approxPolyDP`; rotated bounding rect for skewed codes; accuracy depends on contour quality.*

**Q4 — Decoding**
> "Show me the decoding step. If you used a library (pyzbar/ZXing), what does it do internally that you didn't implement yourself?"

*Hint: Sampling of bars/modules, Reed-Solomon error correction, format string parsing, orientation detection from finder patterns.*

**Q5 — Robustness**
> "How did you handle a low-contrast or slightly skewed code? Show me a difficult test case and how your system handles it."

*Hint: Adaptive thresholding, perspective correction before decoding, contrast stretching, multi-scale approach.*

---

#### Concept Questions

**Q1 — QR finder patterns**
> "What are the finder patterns in a QR code and what role do they play during detection?"

*Hint: Three squares in three corners; 1:1:3:1:1 dark:light ratio in any scan direction; used to determine position, orientation, and version; fourth corner has alignment pattern for larger QR codes.*

**Q2 — Barcode gradient property**
> "Why do barcodes exhibit strong gradients mostly in one direction? How can this be exploited for detection?"

*Hint: Parallel vertical bars → large horizontal gradients, small vertical ones; Sobel-x highlights barcode region; gradient consistency (variance in direction) used as a detection feature.*

**Q3 — Reed-Solomon error correction**
> "What is Reed-Solomon error correction and why is it important for QR codes in real-world conditions?"

*Hint: Redundancy bytes added to the data; polynomial arithmetic over Galois field; up to 30% of the code surface can be damaged or obscured and the data is still recoverable (level H).*

**Q4 — Adaptive vs global thresholding**
> "Explain the difference between adaptive and global thresholding. When is adaptive thresholding critical for a QR code scanner?"

*Hint: Global: single threshold for whole image; adaptive: threshold computed in local windows (mean or Gaussian weighted); critical when lighting is uneven or a shadow falls over part of the code.*

**Q5 — Perspective correction**
> "How would a perspective transform help decode a skewed QR code? What information do you need to apply it?"

*Hint: Four corners of the QR code (from finder patterns) provide 4 point correspondences; warp to a normalised square; makes sampling of modules reliable; equivalent to what the decoder does internally.*

---

---

### Project 4 — Panorama Stitcher *(Intermediate | Max: 18/20)*

**What to check at the start (2 min)**
- Ask the group to run the stitching pipeline on their image pair and show the result.
- Verify: keypoints detected, matches shown, panorama blended without obvious seam.
- Ask: "Did you implement Harris from scratch?" — adjust Q1 accordingly.

---

#### Code Questions

**Q1 — Harris corner detector**
> "Show me your Harris implementation (or explain what OpenCV's version computes). How did you choose the threshold and the k parameter?"

*Hint: Structure tensor M from image gradients; R = det(M) − k·trace(M)²; k ≈ 0.04–0.06; threshold on R to keep strong corners; non-maximum suppression to avoid clusters.*

**Q2 — Descriptor extraction**
> "Show me how you build a descriptor for each keypoint. What information does it encode?"

*Hint: Local patch (raw pixels, gradient histogram, or SIFT); normalisation for illumination invariance; patch size around keypoint; if SIFT: 128-dim gradient histogram over 4×4 cells.*

**Q3 — Keypoint matching**
> "Show me your matching function. How do you filter out bad matches?"

*Hint: NCC or SSD between descriptors; Lowe's ratio test (best match distance / second-best < 0.75); possibly mutual nearest-neighbour check.*

**Q4 — Homography estimation**
> "Show me your `findHomography` call. What does the RANSAC threshold parameter control?"

*Hint: Reprojection error threshold in pixels; a match is an inlier if its reprojected position is within that distance; too loose → noisy H, too tight → too few inliers.*

**Q5 — Blending**
> "Walk me through your blending code at the seam. How did you avoid a hard cut?"

*Hint: Linear alpha ramp from 0→1 across overlap region; distance transform weighting; or multi-band blending (Laplacian pyramid) for different spatial frequencies.*

---

#### Concept Questions

**Q1 — What is a homography?**
> "What geometric relationship does a homography capture? Under what conditions is it valid?"

*Hint: Maps corresponding points between two views of a planar scene, or any scene under pure camera rotation; 3×3 matrix in homogeneous coordinates; valid for planar scenes or rotation-only motion; breaks for parallax (depth variation + translation).*

**Q2 — RANSAC**
> "Explain how RANSAC works and why it is necessary for estimating a homography from matched keypoints."

*Hint: Randomly sample 4 point pairs → compute candidate H → count inliers (reprojection error < threshold) → repeat → keep best H; necessary because putative matches contain many wrong matches (outliers) that break least-squares estimation.*

**Q3 — Harris response**
> "What does the Harris response function measure geometrically? Why does a flat region score near zero?"

*Hint: Eigenvalues λ1, λ2 of M: both large = corner (response high); one large = edge; both small = flat. Flat region: intensity doesn't change in any direction → small gradient → small eigenvalues → low R.*

**Q4 — NCC vs SSD**
> "Compare NCC and SSD as descriptor matching metrics. What are the trade-offs?"

*Hint: SSD = sum of squared differences — fast, sensitive to brightness changes; NCC = normalised cross-correlation — invariant to linear illumination changes (scale + offset), slightly slower; NCC preferred when lighting differs between images.*

**Q5 — Ghosting artifacts**
> "Why does simple alpha blending at the seam sometimes produce ghosting? What technique addresses it?"

*Hint: Ghosting = two versions of the same structure at slightly different positions (misregistration); alpha blend averages them → double image. Multi-band blending (Laplacian pyramid) blends low frequencies (colour/tone) and high frequencies (details) separately → eliminates double edges.*

---

---

### Project 5 — License Plate Deblurring *(Challenging | Max: 20/20)*

**What to check at the start (2 min)**
- Ask the group to show a blurred plate and the deblurred result side by side, with PSNR value.
- Verify they have a synthetic dataset with known blur parameters.
- Ask: "How did you estimate the blur angle and length?" — this is the hardest part.

---

#### Code Questions

**Q1 — Synthetic blur generation**
> "Show me how you create a synthetically blurred image. How do you parameterise the motion blur kernel?"

*Hint: Line kernel of length L at angle θ (1s along a line, 0 elsewhere); normalised so it sums to 1; convolved with the clean image; Gaussian noise added at a known SNR.*

**Q2 — Wiener filter**
> "Show me your Wiener filter implementation. Walk through the formula you implemented in the frequency domain."

*Hint: `G_restored = G_blurred * conj(H) / (|H|² + K)` where H = FFT of PSF, K = noise-to-signal power ratio; take IFFT and clip to [0,255]; K controls trade-off between sharpness and noise amplification.*

**Q3 — Blur parameter estimation**
> "Show me how you estimated the blur length and angle from the blurred image. Walk me through that part of the code."

*Hint: FFT magnitude of blurred image shows periodic dark streaks (sinc zeros) perpendicular to blur direction; detect streak angle (Hough on FFT magnitude or peak in polar coordinates); spacing of zeros gives blur length L.*

**Q4 — Effect of K parameter**
> "What happens in your output when K is too small? Can you demonstrate that?"

*Hint: K too small → amplifies high-frequency noise and zeroes of H → ringing artifacts around edges; K too large → over-smoothed output, residual blur. Show both extremes.*

**Q5 — PSNR evaluation**
> "Show me how you compute PSNR. What value did you achieve and what does it tell you about your restoration?"

*Hint: PSNR = 10·log10(MAX² / MSE); higher is better; typical deblurring: 25–35 dB is reasonable; compare to blurred input PSNR to show improvement.*

---

#### Concept Questions

**Q1 — Point Spread Function**
> "What is a Point Spread Function? What does the PSF of motion blur look like and why?"

*Hint: Impulse response of the imaging system; what a single point of light becomes in the image; motion blur PSF = line segment of length L at angle θ (the path of the sensor relative to the scene during exposure).*

**Q2 — Wiener filter trade-off**
> "Explain the Wiener filter mathematically. What trade-off does the parameter K make?"

*Hint: Minimises mean squared error between restored and true image; K = σ²_noise / σ²_signal; large K → more regularisation, smoother output, less ringing but residual blur; small K → sharper but amplifies noise and ringing at PSF zeros.*

**Q3 — FFT magnitude streaks**
> "Why does the Fourier transform magnitude of a motion-blurred image show dark streaks? What can you extract from them?"

*Hint: Convolution with a line kernel → multiplication by sinc-like function in frequency domain → periodic zeros along one axis of the frequency plane; streaks are perpendicular to blur direction; streak spacing inversely proportional to blur length.*

**Q4 — Blind vs non-blind deconvolution**
> "What is the difference between blind and non-blind deconvolution? Which category does your project fall into?"

*Hint: Non-blind: PSF is known exactly; blind: PSF is completely unknown and must be estimated jointly with the image. This project is semi-blind: PSF is estimated from the blurred image (from FFT analysis) then used in a non-blind Wiener filter.*

**Q5 — Why PSNR alone is not enough**
> "Is PSNR a perfect measure of deblurring quality? What are its limitations?"

*Hint: PSNR is pixel-level MSE — doesn't model human visual perception; a slightly blurry image can have good PSNR if no ringing, but look bad perceptually; SSIM also measures structural similarity (luminance, contrast, structure); a sharp but noisy image may score worse on SSIM than on PSNR.*

---

## Quick Reference — Defense Flow

```
1. Group arrives → ask them to run notebook (2 min)
2. Quick visual check: does the output look correct?
3. Ask one general question to the whole group:
   "Walk us through your pipeline in 2 minutes."
4. Each student draws a tombola card (Code or Concept)
5. You pick a question from the relevant section above
6. Student answers (aim for ~3–4 min per student)
7. You may ask one follow-up based on their answer
8. Record your notes and grade
```

---

## Notes Section

*(Use this space during the defense)*

| Group | Project | Student 1 | Card | Grade | Student 2 | Card | Grade | Student 3 | Card | Grade | Total |
|-------|---------|-----------|------|-------|-----------|------|-------|-----------|------|-------|-------|
| | | | | | | | | | | | |
| | | | | | | | | | | | |
| | | | | | | | | | | | |
| | | | | | | | | | | | |
| | | | | | | | | | | | |
| | | | | | | | | | | | |
| | | | | | | | | | | | |
| | | | | | | | | | | | |

---

*Introduction to Computer Vision — ESIN, UIR — Spring 2026*