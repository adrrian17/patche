# Digital Files upload directly from the browser to R2 with a presigned URL

Cloudflare Workers cap request bodies at 100 MB on Free and Pro plans, and Digital Files can reach 500 MB. So the Worker never receives a Digital File: it signs an S3-style PUT URL for the private bucket using an R2 API token held as a Worker secret, and the admin browser uploads straight to R2. Product Media, being small, still passes through the Worker via the R2 binding. Consequence: the private bucket needs a CORS rule scoped to the admin origin, and an R2 access key pair exists alongside the binding.
