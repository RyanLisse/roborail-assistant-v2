{
  "id": "roborail-assistant-w34i",
  "lang": "typescript",
  "global_cors": {
    "allow_origins_with_credentials": [
      "http://localhost:3000",
      "http://localhost:3001", 
      "https://roborail-assistant.vercel.app",
      "https://*.vercel.app"
    ]
  },
  "services": [
    {
      "name": "chat",
      "resources": {
        "cpu": "0.5",
        "memory": "1Gi"
      },
      "scaling": {
        "minInstances": 2,
        "maxInstances": 10,
        "targetCPU": 60
      }
    },
    {
      "name": "upload", 
      "resources": {
        "cpu": "1",
        "memory": "2Gi"
      },
      "scaling": {
        "minInstances": 1,
        "maxInstances": 5,
        "targetCPU": 70
      }
    },
    {
      "name": "docprocessing",
      "resources": {
        "cpu": "2",
        "memory": "4Gi"
      },
      "scaling": {
        "minInstances": 1,
        "maxInstances": 10,
        "targetCPU": 70
      }
    },
    {
      "name": "search",
      "resources": {
        "cpu": "1",
        "memory": "2Gi"
      },
      "scaling": {
        "minInstances": 1,
        "maxInstances": 8,
        "targetCPU": 65
      }
    },
    {
      "name": "llm",
      "resources": {
        "cpu": "0.5",
        "memory": "1Gi"
      },
      "scaling": {
        "minInstances": 1,
        "maxInstances": 12,
        "targetCPU": 60
      }
    },
    {
      "name": "docmgmt",
      "resources": {
        "cpu": "0.25",
        "memory": "512Mi"
      },
      "scaling": {
        "minInstances": 1,
        "maxInstances": 5,
        "targetCPU": 70
      }
    }
  ]
}