# Use an official Node.js runtime as a parent image
FROM node:current-alpine

# Set the working directory to /app
WORKDIR /app

# Copy the current directory contents into the container at /app
COPY . /app

# Install any needed packages specified in package.json using Yarn
RUN yarn install

# Compile TypeScript code
RUN yarn run build

# Set the command to run the application
CMD ["node", "dist/app.js"]