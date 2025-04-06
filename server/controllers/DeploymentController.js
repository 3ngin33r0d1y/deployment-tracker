const Deployment = require('../models/Deployment');
const DeploymentFile = require('../models/DeploymentFile');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Create unique filename with original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  // Accept only specific file types
  const allowedFileTypes = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedFileTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, Word, Excel, and PowerPoint files are allowed.'), false);
  }
};

// Configure upload
const upload = multer({
  storage: storage,
  limits: { fileSize: 200 * 1024 * 1024 }, // 200MB limit
  fileFilter: fileFilter
});

// Deployment Controller
const DeploymentController = {
  // Upload middleware
  uploadMiddleware: upload.single('file'),
  
  // Create a new deployment with mandatory file upload
  async createDeploymentWithFile(req, res) {
    try {
      // Check if file was uploaded
      if (!req.file) {
        return res.status(400).json({ message: 'File upload is mandatory for deployment creation' });
      }

      const { serviceId, version, changes } = req.body;
      
      // Create deployment
      const deployment = await Deployment.create(serviceId, version, changes, req.user.id);
      
      // Process the uploaded file
      const fileName = req.file.originalname;
      const filePath = req.file.path;
      const fileType = path.extname(fileName).substring(1);
      const fileSize = req.file.size;

      // Create file record
      const file = await DeploymentFile.create(
        deployment.id,
        fileName,
        filePath,
        fileType,
        fileSize,
        req.user.id
      );

      // Return both deployment and file information
      res.status(201).json({ 
        success: true, 
        deployment,
        file
      });
    } catch (error) {
      console.error('Create deployment with file error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // Legacy create deployment method (kept for backward compatibility)
  async createDeployment(req, res) {
    const { serviceId, version, changes } = req.body;
    
    try {
      const deployment = await Deployment.create(serviceId, version, changes, req.user.id);
      res.status(201).json({ success: true, deployment });
    } catch (error) {
      console.error('Create deployment error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // Get all deployments with their files
  async getAllDeployments(req, res) {
    try {
      const deployments = await Deployment.findAll();
      
      // Get files for each deployment
      const deploymentsWithFiles = await Promise.all(
        deployments.map(async (deployment) => {
          const files = await DeploymentFile.findByDeployment(deployment.id);
          return {
            ...deployment,
            files: files
          };
        })
      );
      
      res.json({ success: true, deployments: deploymentsWithFiles });
    } catch (error) {
      console.error('Get all deployments error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // Get deployment by ID
  async getDeploymentById(req, res) {
    try {
      const deployment = await Deployment.findById(req.params.id);
      if (!deployment) {
        return res.status(404).json({ message: 'Deployment not found' });
      }
      
      // Get associated files
      const files = await DeploymentFile.findByDeployment(req.params.id);
      
      res.json({ 
        success: true, 
        deployment,
        files
      });
    } catch (error) {
      console.error('Get deployment by ID error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // Get deployments by service ID
  async getDeploymentsByServiceId(req, res) {
    try {
      const deployments = await Deployment.findByService(req.params.serviceId);
      
      // Get files for each deployment
      const deploymentsWithFiles = await Promise.all(
        deployments.map(async (deployment) => {
          const files = await DeploymentFile.findByDeployment(deployment.id);
          return {
            ...deployment,
            files: files
          };
        })
      );
      
      res.json({ success: true, deployments: deploymentsWithFiles });
    } catch (error) {
      console.error('Get deployments by service ID error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // Upload deployment file
  async uploadDeploymentFile(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      const { deploymentId } = req.params;
      const fileName = req.file.originalname;
      const filePath = req.file.path;
      const fileType = path.extname(fileName).substring(1);
      const fileSize = req.file.size;

      const file = await DeploymentFile.create(
        deploymentId,
        fileName,
        filePath,
        fileType,
        fileSize,
        req.user.id
      );

      res.status(201).json({ success: true, file });
    } catch (error) {
      console.error('Upload deployment file error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // Get deployment file
  async getDeploymentFile(req, res) {
    try {
      const file = await DeploymentFile.findById(req.params.fileId);
      if (!file) {
        return res.status(404).json({ message: 'File not found' });
      }

      res.download(file.file_path, file.file_name);
    } catch (error) {
      console.error('Get deployment file error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  },

  // Delete deployment
  async deleteDeployment(req, res) {
    try {
      const deployment = await Deployment.delete(req.params.id);
      if (!deployment) {
        return res.status(404).json({ message: 'Deployment not found' });
      }
      res.json({ success: true, message: 'Deployment deleted successfully' });
    } catch (error) {
      console.error('Delete deployment error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
};

module.exports = DeploymentController;
