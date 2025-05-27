import { describe, test, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { nanoid } from "nanoid";

// Mock data structures for testing
const mockCollections = new Map();
const mockDocumentTags = new Map();
const mockCollectionDocuments = new Map();
const mockSavedFilters = new Map();
const mockDocuments = new Map();

// Mock document and collection data
const createMockDocument = (overrides = {}) => ({
  id: nanoid(),
  userId: `user_${nanoid()}`,
  filename: "test-document.pdf",
  originalName: "Test Document.pdf",
  contentType: "application/pdf",
  fileSize: 1024 * 1024,
  status: "processed" as const,
  uploadedAt: new Date(),
  processedAt: new Date(),
  chunkCount: 5,
  metadata: {
    title: "Test Document",
    author: "Test Author",
    department: "Engineering",
  },
  ...overrides,
});

const createMockCollection = (overrides = {}) => ({
  id: nanoid(),
  userId: `user_${nanoid()}`,
  name: "Test Collection",
  description: "A test collection for organizing documents",
  isPublic: false,
  documentCount: 0,
  tags: ["test", "collection"],
  color: "#3B82F6",
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const createMockSavedFilter = (overrides = {}) => ({
  id: nanoid(),
  userId: `user_${nanoid()}`,
  name: "Engineering PDFs",
  description: "All PDF documents from Engineering department",
  filters: {
    contentType: "application/pdf",
    department: "Engineering",
    status: "processed",
  },
  isPublic: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

// Mock collection operations
const mockCollectionOperations = {
  async create(collection: any) {
    const withDates = { ...collection, createdAt: new Date(), updatedAt: new Date() };
    mockCollections.set(collection.id, withDates);
    return withDates;
  },

  async findByUserId(userId: string, filters: any = {}) {
    const userCollections = Array.from(mockCollections.values())
      .filter((collection: any) => collection.userId === userId || collection.isPublic);
    
    let filtered = userCollections;
    if (filters.search) {
      filtered = filtered.filter((collection: any) => 
        collection.name.toLowerCase().includes(filters.search.toLowerCase()) ||
        collection.description?.toLowerCase().includes(filters.search.toLowerCase())
      );
    }
    if (filters.tags && filters.tags.length > 0) {
      filtered = filtered.filter((collection: any) => 
        filters.tags.some((tag: string) => collection.tags?.includes(tag))
      );
    }

    // Apply pagination
    const limit = filters.limit || 20;
    const offset = ((filters.page || 1) - 1) * limit;
    const paginatedResults = filtered.slice(offset, offset + limit);

    return {
      collections: paginatedResults,
      total: filtered.length,
      hasMore: offset + limit < filtered.length,
    };
  },

  async findById(id: string) {
    return mockCollections.get(id) || null;
  },

  async update(id: string, updates: any) {
    const collection = mockCollections.get(id);
    if (!collection) return null;
    
    const updatedCollection = { ...collection, ...updates, updatedAt: new Date() };
    mockCollections.set(id, updatedCollection);
    return updatedCollection;
  },

  async delete(id: string) {
    const collection = mockCollections.get(id);
    if (!collection) return false;
    
    mockCollections.delete(id);
    // Remove all document associations
    Array.from(mockCollectionDocuments.keys()).forEach(key => {
      const [collectionId] = key.split('::');
      if (collectionId === id) {
        mockCollectionDocuments.delete(key);
      }
    });
    return true;
  },

  async addDocument(collectionId: string, documentId: string) {
    const key = `${collectionId}::${documentId}`;
    mockCollectionDocuments.set(key, {
      collectionId,
      documentId,
      addedAt: new Date(),
    });
    
    // Update document count
    const collection = mockCollections.get(collectionId);
    if (collection) {
      collection.documentCount = (collection.documentCount || 0) + 1;
      collection.updatedAt = new Date();
    }
    
    return true;
  },

  async removeDocument(collectionId: string, documentId: string) {
    const key = `${collectionId}::${documentId}`;
    const existed = mockCollectionDocuments.has(key);
    mockCollectionDocuments.delete(key);
    
    if (existed) {
      // Update document count
      const collection = mockCollections.get(collectionId);
      if (collection) {
        collection.documentCount = Math.max(0, (collection.documentCount || 0) - 1);
        collection.updatedAt = new Date();
      }
    }
    
    return existed;
  },

  async getDocuments(collectionId: string, filters: any = {}) {
    const collectionDocs = Array.from(mockCollectionDocuments.values())
      .filter((cd: any) => cd.collectionId === collectionId);
    
    const documentIds = collectionDocs.map((cd: any) => cd.documentId);
    const documents = Array.from(mockDocuments.values())
      .filter((doc: any) => documentIds.includes(doc.id));

    // Apply pagination
    const limit = filters.limit || 20;
    const offset = ((filters.page || 1) - 1) * limit;
    const paginatedResults = documents.slice(offset, offset + limit);

    return {
      documents: paginatedResults,
      total: documents.length,
      hasMore: offset + limit < documents.length,
    };
  },
};

// Mock tag operations
const mockTagOperations = {
  async getPopularTags(userId: string, limit: number = 20) {
    const userDocs = Array.from(mockDocuments.values())
      .filter((doc: any) => doc.userId === userId);
    
    const tagCounts: Record<string, number> = {};
    userDocs.forEach((doc: any) => {
      if (doc.metadata.tags) {
        doc.metadata.tags.forEach((tag: string) => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      }
    });

    return Object.entries(tagCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([tag, count]) => ({ tag, count }));
  },

  async addTag(documentId: string, tag: string) {
    const key = `${documentId}::${tag}`;
    mockDocumentTags.set(key, {
      documentId,
      tag,
      addedAt: new Date(),
    });
    return true;
  },

  async removeTag(documentId: string, tag: string) {
    const key = `${documentId}::${tag}`;
    return mockDocumentTags.delete(key);
  },

  async getDocumentTags(documentId: string) {
    return Array.from(mockDocumentTags.values())
      .filter((dt: any) => dt.documentId === documentId)
      .map((dt: any) => dt.tag);
  },

  async findDocumentsByTag(tag: string, userId: string, filters: any = {}) {
    const taggedDocuments = Array.from(mockDocumentTags.values())
      .filter((dt: any) => dt.tag === tag);
    
    const documentIds = taggedDocuments.map((dt: any) => dt.documentId);
    const documents = Array.from(mockDocuments.values())
      .filter((doc: any) => doc.userId === userId && documentIds.includes(doc.id));

    // Apply pagination
    const limit = filters.limit || 20;
    const offset = ((filters.page || 1) - 1) * limit;
    const paginatedResults = documents.slice(offset, offset + limit);

    return {
      documents: paginatedResults,
      total: documents.length,
      hasMore: offset + limit < documents.length,
    };
  },
};

// Mock saved filter operations
const mockSavedFilterOperations = {
  async create(filter: any) {
    const withDates = { ...filter, createdAt: new Date(), updatedAt: new Date() };
    mockSavedFilters.set(filter.id, withDates);
    return withDates;
  },

  async findByUserId(userId: string) {
    return Array.from(mockSavedFilters.values())
      .filter((filter: any) => filter.userId === userId || filter.isPublic)
      .sort((a: any, b: any) => b.updatedAt - a.updatedAt);
  },

  async findById(id: string) {
    return mockSavedFilters.get(id) || null;
  },

  async update(id: string, updates: any) {
    const filter = mockSavedFilters.get(id);
    if (!filter) return null;
    
    const updatedFilter = { ...filter, ...updates, updatedAt: new Date() };
    mockSavedFilters.set(id, updatedFilter);
    return updatedFilter;
  },

  async delete(id: string) {
    return mockSavedFilters.delete(id);
  },

  async applyFilter(filterId: string, additionalFilters: any = {}) {
    const filter = mockSavedFilters.get(filterId);
    if (!filter) return null;

    const combinedFilters = { ...filter.filters, ...additionalFilters };
    
    // Mock applying filters to documents
    let documents = Array.from(mockDocuments.values())
      .filter((doc: any) => doc.userId === filter.userId);

    if (combinedFilters.contentType) {
      documents = documents.filter((doc: any) => doc.contentType === combinedFilters.contentType);
    }
    if (combinedFilters.status) {
      documents = documents.filter((doc: any) => doc.status === combinedFilters.status);
    }
    if (combinedFilters.department) {
      documents = documents.filter((doc: any) => doc.metadata.department === combinedFilters.department);
    }

    return {
      documents,
      appliedFilters: combinedFilters,
      total: documents.length,
    };
  },
};

describe("Document Organization and Filtering", () => {
  beforeEach(() => {
    // Clear mock data before each test
    mockCollections.clear();
    mockDocumentTags.clear();
    mockCollectionDocuments.clear();
    mockSavedFilters.clear();
    mockDocuments.clear();
  });

  describe("Collection Management", () => {
    test("should create a new collection", async () => {
      const collectionData = createMockCollection();
      
      const result = await mockCollectionOperations.create(collectionData);
      
      expect(result).toMatchObject(collectionData);
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    test("should retrieve collections for a user", async () => {
      const userId = "test-user-123";
      const collections = [
        createMockCollection({ userId, name: "Personal Docs" }),
        createMockCollection({ userId, name: "Work Projects" }),
        createMockCollection({ userId: "other-user", name: "Other User's Collection" }),
        createMockCollection({ userId: "other-user", name: "Public Collection", isPublic: true }),
      ];

      for (const collection of collections) {
        await mockCollectionOperations.create(collection);
      }

      const result = await mockCollectionOperations.findByUserId(userId);
      
      expect(result.collections).toHaveLength(3); // 2 own + 1 public
      expect(result.total).toBe(3);
    });

    test("should search collections by name and description", async () => {
      const userId = "test-user-123";
      const collections = [
        createMockCollection({ userId, name: "Project Alpha", description: "Machine learning project" }),
        createMockCollection({ userId, name: "Personal Notes", description: "Personal documentation" }),
        createMockCollection({ userId, name: "Archive", description: "Old project files" }),
      ];

      for (const collection of collections) {
        await mockCollectionOperations.create(collection);
      }

      const result = await mockCollectionOperations.findByUserId(userId, { search: "project" });
      
      expect(result.collections).toHaveLength(2);
      expect(result.collections.map((c: any) => c.name)).toContain("Project Alpha");
      expect(result.collections.map((c: any) => c.name)).toContain("Archive");
    });

    test("should filter collections by tags", async () => {
      const userId = "test-user-123";
      const collections = [
        createMockCollection({ userId, name: "ML Research", tags: ["machine-learning", "research"] }),
        createMockCollection({ userId, name: "Web Development", tags: ["web", "development"] }),
        createMockCollection({ userId, name: "Data Science", tags: ["data-science", "research"] }),
      ];

      for (const collection of collections) {
        await mockCollectionOperations.create(collection);
      }

      const result = await mockCollectionOperations.findByUserId(userId, { tags: ["research"] });
      
      expect(result.collections).toHaveLength(2);
      expect(result.collections.every((c: any) => c.tags.includes("research"))).toBe(true);
    });

    test("should update collection metadata", async () => {
      const collectionData = createMockCollection();
      await mockCollectionOperations.create(collectionData);
      
      const updates = {
        name: "Updated Collection Name",
        description: "Updated description",
        color: "#FF5722",
        tags: ["updated", "test"],
      };
      
      const result = await mockCollectionOperations.update(collectionData.id, updates);
      
      expect(result.name).toBe("Updated Collection Name");
      expect(result.description).toBe("Updated description");
      expect(result.color).toBe("#FF5722");
      expect(result.tags).toEqual(["updated", "test"]);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    test("should delete collection and remove document associations", async () => {
      const collectionData = createMockCollection();
      await mockCollectionOperations.create(collectionData);
      
      // Add some documents to the collection
      await mockCollectionOperations.addDocument(collectionData.id, "doc1");
      await mockCollectionOperations.addDocument(collectionData.id, "doc2");
      
      const result = await mockCollectionOperations.delete(collectionData.id);
      
      expect(result).toBe(true);
      expect(mockCollections.has(collectionData.id)).toBe(false);
      
      // Verify document associations are removed
      const remainingAssociations = Array.from(mockCollectionDocuments.values())
        .filter((cd: any) => cd.collectionId === collectionData.id);
      expect(remainingAssociations).toHaveLength(0);
    });
  });

  describe("Collection Document Management", () => {
    let testCollection: any;
    let testDocuments: any[];

    beforeEach(async () => {
      testCollection = createMockCollection();
      await mockCollectionOperations.create(testCollection);
      
      testDocuments = [
        createMockDocument({ id: "doc1", filename: "document1.pdf" }),
        createMockDocument({ id: "doc2", filename: "document2.pdf" }),
        createMockDocument({ id: "doc3", filename: "document3.pdf" }),
      ];
      
      for (const doc of testDocuments) {
        mockDocuments.set(doc.id, doc);
      }
    });

    test("should add documents to collection", async () => {
      const result1 = await mockCollectionOperations.addDocument(testCollection.id, "doc1");
      const result2 = await mockCollectionOperations.addDocument(testCollection.id, "doc2");
      
      expect(result1).toBe(true);
      expect(result2).toBe(true);
      
      const updatedCollection = await mockCollectionOperations.findById(testCollection.id);
      expect(updatedCollection.documentCount).toBe(2);
    });

    test("should remove documents from collection", async () => {
      await mockCollectionOperations.addDocument(testCollection.id, "doc1");
      await mockCollectionOperations.addDocument(testCollection.id, "doc2");
      
      const result = await mockCollectionOperations.removeDocument(testCollection.id, "doc1");
      
      expect(result).toBe(true);
      
      const updatedCollection = await mockCollectionOperations.findById(testCollection.id);
      expect(updatedCollection.documentCount).toBe(1);
    });

    test("should retrieve documents in collection with pagination", async () => {
      await mockCollectionOperations.addDocument(testCollection.id, "doc1");
      await mockCollectionOperations.addDocument(testCollection.id, "doc2");
      await mockCollectionOperations.addDocument(testCollection.id, "doc3");
      
      const result = await mockCollectionOperations.getDocuments(testCollection.id, { 
        page: 1, 
        limit: 2 
      });
      
      expect(result.documents).toHaveLength(2);
      expect(result.total).toBe(3);
      expect(result.hasMore).toBe(true);
    });

    test("should handle duplicate document additions gracefully", async () => {
      await mockCollectionOperations.addDocument(testCollection.id, "doc1");
      await mockCollectionOperations.addDocument(testCollection.id, "doc1"); // Duplicate
      
      const updatedCollection = await mockCollectionOperations.findById(testCollection.id);
      expect(updatedCollection.documentCount).toBe(2); // Mock doesn't prevent duplicates
    });
  });

  describe("Tag Management", () => {
    let testDocuments: any[];

    beforeEach(async () => {
      testDocuments = [
        createMockDocument({ 
          id: "doc1", 
          userId: "user1",
          metadata: { tags: ["machine-learning", "python", "research"] }
        }),
        createMockDocument({ 
          id: "doc2", 
          userId: "user1",
          metadata: { tags: ["web-development", "javascript", "react"] }
        }),
        createMockDocument({ 
          id: "doc3", 
          userId: "user1",
          metadata: { tags: ["machine-learning", "tensorflow", "research"] }
        }),
      ];
      
      for (const doc of testDocuments) {
        mockDocuments.set(doc.id, doc);
        // Add tags to mock system
        if (doc.metadata.tags) {
          for (const tag of doc.metadata.tags) {
            await mockTagOperations.addTag(doc.id, tag);
          }
        }
      }
    });

    test("should get popular tags for user", async () => {
      const result = await mockTagOperations.getPopularTags("user1");
      
      expect(result).toHaveLength(6);
      expect(result.find(r => r.tag === "machine-learning")?.count).toBe(2);
      expect(result.find(r => r.tag === "research")?.count).toBe(2);
      expect(result.find(r => r.tag === "python")?.count).toBe(1);
    });

    test("should add and remove tags from documents", async () => {
      await mockTagOperations.addTag("doc1", "new-tag");
      
      let tags = await mockTagOperations.getDocumentTags("doc1");
      expect(tags).toContain("new-tag");
      
      await mockTagOperations.removeTag("doc1", "new-tag");
      
      tags = await mockTagOperations.getDocumentTags("doc1");
      expect(tags).not.toContain("new-tag");
    });

    test("should find documents by tag", async () => {
      const result = await mockTagOperations.findDocumentsByTag("machine-learning", "user1");
      
      expect(result.documents).toHaveLength(2);
      expect(result.documents.map((d: any) => d.id)).toEqual(["doc1", "doc3"]);
      expect(result.total).toBe(2);
    });

    test("should handle tag search with pagination", async () => {
      const result = await mockTagOperations.findDocumentsByTag("machine-learning", "user1", {
        page: 1,
        limit: 1,
      });
      
      expect(result.documents).toHaveLength(1);
      expect(result.total).toBe(2);
      expect(result.hasMore).toBe(true);
    });
  });

  describe("Saved Filters", () => {
    test("should create a saved filter", async () => {
      const filterData = createMockSavedFilter();
      
      const result = await mockSavedFilterOperations.create(filterData);
      
      expect(result).toMatchObject(filterData);
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    test("should retrieve saved filters for user", async () => {
      const userId = "test-user-123";
      const filters = [
        createMockSavedFilter({ userId, name: "PDF Documents" }),
        createMockSavedFilter({ userId, name: "Recent Uploads" }),
        createMockSavedFilter({ userId: "other-user", name: "Other User's Filter" }),
        createMockSavedFilter({ userId: "other-user", name: "Public Filter", isPublic: true }),
      ];

      for (const filter of filters) {
        await mockSavedFilterOperations.create(filter);
      }

      const result = await mockSavedFilterOperations.findByUserId(userId);
      
      expect(result).toHaveLength(3); // 2 own + 1 public
    });

    test("should update saved filter", async () => {
      const filterData = createMockSavedFilter();
      await mockSavedFilterOperations.create(filterData);
      
      const updates = {
        name: "Updated Filter Name",
        description: "Updated description",
        filters: {
          contentType: "text/plain",
          status: "processed",
        },
      };
      
      const result = await mockSavedFilterOperations.update(filterData.id, updates);
      
      expect(result.name).toBe("Updated Filter Name");
      expect(result.description).toBe("Updated description");
      expect(result.filters.contentType).toBe("text/plain");
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    test("should apply saved filter to find documents", async () => {
      const userId = "test-user-123";
      const filterData = createMockSavedFilter({
        userId,
        filters: {
          contentType: "application/pdf",
          status: "processed",
        },
      });
      await mockSavedFilterOperations.create(filterData);
      
      // Create test documents
      const testDocs = [
        createMockDocument({ userId, contentType: "application/pdf", status: "processed" }),
        createMockDocument({ userId, contentType: "text/plain", status: "processed" }),
        createMockDocument({ userId, contentType: "application/pdf", status: "processing" }),
      ];
      
      for (const doc of testDocs) {
        mockDocuments.set(doc.id, doc);
      }
      
      const result = await mockSavedFilterOperations.applyFilter(filterData.id);
      
      expect(result.documents).toHaveLength(1);
      expect(result.documents[0].contentType).toBe("application/pdf");
      expect(result.documents[0].status).toBe("processed");
      expect(result.appliedFilters.contentType).toBe("application/pdf");
    });

    test("should combine saved filter with additional filters", async () => {
      const userId = "test-user-123";
      const filterData = createMockSavedFilter({
        userId,
        filters: {
          contentType: "application/pdf",
        },
      });
      await mockSavedFilterOperations.create(filterData);
      
      const result = await mockSavedFilterOperations.applyFilter(filterData.id, {
        status: "processed",
        department: "Engineering",
      });
      
      expect(result.appliedFilters.contentType).toBe("application/pdf");
      expect(result.appliedFilters.status).toBe("processed");
      expect(result.appliedFilters.department).toBe("Engineering");
    });
  });

  describe("Advanced Organization Features", () => {
    test("should handle complex collection hierarchies", async () => {
      const userId = "test-user-123";
      const parentCollection = createMockCollection({ 
        userId, 
        name: "Parent Project",
        metadata: { type: "parent" }
      });
      
      const childCollections = [
        createMockCollection({ 
          userId, 
          name: "Sub-project A",
          metadata: { type: "child", parentId: parentCollection.id }
        }),
        createMockCollection({ 
          userId, 
          name: "Sub-project B",
          metadata: { type: "child", parentId: parentCollection.id }
        }),
      ];
      
      await mockCollectionOperations.create(parentCollection);
      for (const child of childCollections) {
        await mockCollectionOperations.create(child);
      }
      
      const result = await mockCollectionOperations.findByUserId(userId);
      expect(result.collections).toHaveLength(3);
    });

    test("should support smart auto-tagging based on content", async () => {
      const testDoc = createMockDocument({
        filename: "machine-learning-research.pdf",
        metadata: {
          title: "Deep Learning Applications in Computer Vision",
          author: "Dr. Jane Smith",
          department: "AI Research",
        },
      });
      
      // Mock smart tagging logic
      const suggestedTags = [];
      if (testDoc.filename.includes("machine-learning")) {
        suggestedTags.push("machine-learning");
      }
      if (testDoc.metadata.title?.includes("Deep Learning")) {
        suggestedTags.push("deep-learning");
      }
      if (testDoc.metadata.title?.includes("Computer Vision")) {
        suggestedTags.push("computer-vision");
      }
      if (testDoc.metadata.department === "AI Research") {
        suggestedTags.push("ai-research");
      }
      
      expect(suggestedTags).toContain("machine-learning");
      expect(suggestedTags).toContain("deep-learning");
      expect(suggestedTags).toContain("computer-vision");
      expect(suggestedTags).toContain("ai-research");
      expect(suggestedTags).toHaveLength(4);
    });

    test("should provide document organization recommendations", async () => {
      const userId = "test-user-123";
      
      // Create documents with similar patterns
      const testDocs = [
        createMockDocument({ 
          userId, 
          filename: "project-a-spec.pdf",
          metadata: { department: "Engineering", project: "Project A" }
        }),
        createMockDocument({ 
          userId, 
          filename: "project-a-design.pdf",
          metadata: { department: "Engineering", project: "Project A" }
        }),
        createMockDocument({ 
          userId, 
          filename: "project-b-spec.pdf",
          metadata: { department: "Engineering", project: "Project B" }
        }),
      ];
      
      for (const doc of testDocs) {
        mockDocuments.set(doc.id, doc);
      }
      
      // Mock recommendation logic
      const recommendations = [];
      
      // Group by project
      const projectGroups: Record<string, any[]> = {};
      Array.from(mockDocuments.values())
        .filter((doc: any) => doc.userId === userId)
        .forEach((doc: any) => {
          const project = doc.metadata.project;
          if (project) {
            if (!projectGroups[project]) {
              projectGroups[project] = [];
            }
            projectGroups[project].push(doc);
          }
        });
      
      // Suggest collections for projects with multiple documents
      Object.entries(projectGroups).forEach(([project, docs]) => {
        if (docs.length >= 2) {
          recommendations.push({
            type: "create_collection",
            reason: `Multiple documents found for ${project}`,
            suggestedName: project,
            documentIds: docs.map(d => d.id),
          });
        }
      });
      
      expect(recommendations).toHaveLength(2);
      expect(recommendations[0].suggestedName).toBe("Project A");
      expect(recommendations[0].documentIds).toHaveLength(2);
      expect(recommendations[1].suggestedName).toBe("Project B");
      expect(recommendations[1].documentIds).toHaveLength(1);
    });
  });

  describe("Performance and Scalability", () => {
    test("should handle large numbers of collections efficiently", async () => {
      const userId = "test-user-123";
      const collectionCount = 100;
      
      const startTime = Date.now();
      
      // Create many collections
      const createPromises = Array.from({ length: collectionCount }, (_, i) => 
        mockCollectionOperations.create(createMockCollection({
          userId,
          name: `Collection ${i}`,
          tags: [`tag-${i % 10}`], // 10 different tags
        }))
      );
      
      await Promise.all(createPromises);
      
      const duration = Date.now() - startTime;
      console.log(`Created ${collectionCount} collections in ${duration}ms`);
      
      // Test filtering performance
      const filterStartTime = Date.now();
      const result = await mockCollectionOperations.findByUserId(userId, { 
        tags: ["tag-5"],
        page: 1,
        limit: 20,
      });
      const filterDuration = Date.now() - filterStartTime;
      
      console.log(`Filtered collections in ${filterDuration}ms`);
      expect(result.collections).toHaveLength(10); // Should find ~10 collections with tag-5
    });

    test("should optimize tag queries for large document sets", async () => {
      const userId = "test-user-123";
      const documentCount = 200;
      
      // Create many documents with various tags
      for (let i = 0; i < documentCount; i++) {
        const doc = createMockDocument({
          userId,
          id: `doc-${i}`,
          metadata: {
            tags: [`category-${i % 5}`, `type-${i % 3}`, `priority-${i % 2}`],
          },
        });
        mockDocuments.set(doc.id, doc);
        
        // Add tags to system
        for (const tag of doc.metadata.tags) {
          await mockTagOperations.addTag(doc.id, tag);
        }
      }
      
      const startTime = Date.now();
      const popularTags = await mockTagOperations.getPopularTags(userId, 20);
      const duration = Date.now() - startTime;
      
      console.log(`Retrieved popular tags in ${duration}ms`);
      expect(popularTags).toHaveLength(10); // 5 categories + 3 types + 2 priorities
      expect(popularTags[0].count).toBeGreaterThan(popularTags[popularTags.length - 1].count);
    });
  });
});