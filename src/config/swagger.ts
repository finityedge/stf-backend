import swaggerJsdoc from 'swagger-jsdoc';

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'STF Scholarship Portal API',
            version: '2.0.0',
            description: 'Backend API for the Soipan Tuya Foundation Scholarship Management System',
            contact: {
                name: 'API Support',
                email: 'support@stf.org',
            },
        },
        servers: [
            {
                url: 'http://localhost:3000',
                description: 'Local Development Server',
            },
            {
                url: 'https://api.stf-portal.org',
                description: 'Production Server',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
            schemas: {
                // ... (schemas will be auto-generated from code annotations, 
                // but we can define common ones here if needed)
                ErrorResponse: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: false },
                        error: {
                            type: 'object',
                            properties: {
                                code: { type: 'string', example: 'VALIDATION_ERROR' },
                                message: { type: 'string', example: 'Invalid input data' }
                            }
                        },
                        timestamp: { type: 'string', format: 'date-time' }
                    }
                },
                CreateProfileRequest: {
                    type: 'object',
                    required: ['fullName', 'dateOfBirth', 'gender', 'countyId'],
                    properties: {
                        fullName: { type: 'string' },
                        dateOfBirth: { type: 'string', format: 'date' },
                        gender: { type: 'string', enum: ['MALE', 'FEMALE', 'OTHER'] },
                        nationalIdNumber: { type: 'string' },
                        passportNumber: { type: 'string' },
                        countyId: { type: 'string', format: 'uuid' },
                        subCountyId: { type: 'string', format: 'uuid' },
                        wardId: { type: 'string', format: 'uuid' },
                        institutionName: { type: 'string' },
                        institutionType: { type: 'string', enum: ['HIGH_SCHOOL', 'UNIVERSITY', 'COLLEGE', 'TVET'] },
                        programmeOrCourse: { type: 'string' },
                        admissionYear: { type: 'integer' }
                    }
                },
                CreateDraftRequest: {
                    type: 'object',
                    properties: {
                        outstandingFeesBalance: { type: 'number' },
                        hardshipNarrative: { type: 'string' },
                        currentYearOfStudy: { type: 'string' },
                        modeOfSponsorship: { type: 'array', items: { type: 'string' } }
                    }
                },
                BulkUpdateRequest: {
                    type: 'object',
                    required: ['applicationIds', 'newStatus'],
                    properties: {
                        applicationIds: {
                            type: 'array',
                            items: { type: 'string', format: 'uuid' }
                        },
                        newStatus: {
                            type: 'string',
                            enum: ['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'DISBURSED']
                        },
                        note: { type: 'string' }
                    }
                }
            },
        },
    },
    apis: [
        './src/routes/*.ts',
        './src/controllers/*.ts',
    ],
};

export const specs = swaggerJsdoc(options);
