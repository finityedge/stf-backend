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
                url: process.env.APP_URL || 'http://localhost:3000',
                description: 'API Server',
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
                PortalConfig: {
                    type: 'object',
                    properties: {
                        academicYear: { type: 'string', example: '2025/26' },
                        applicationDeadline: { type: 'string', nullable: true, format: 'date-time' },
                        applicationWindowOpen: { type: 'boolean', example: true },
                        foundationName: { type: 'string', example: 'Soipan Tuya Foundation' },
                        contactEmail: { type: 'string', example: 'info@soipantuyafoundation.org' },
                        contactPhone: { type: 'string', example: '+254 700 000 000' },
                        maxFileSize: { type: 'number', example: 5242880 },
                        allowedFileTypes: { type: 'array', items: { type: 'string' }, example: ['application/pdf', 'image/jpeg', 'image/png'] }
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
                        admissionYear: { type: 'integer' },
                        currentResidence: { type: 'string' },
                        institutionId: { type: 'string', format: 'uuid' },
                        whoLivesWith: { type: 'string', enum: ['BOTH_PARENTS', 'SINGLE_MOTHER', 'SINGLE_FATHER', 'GUARDIAN', 'GRANDPARENT', 'ORPHANAGE', 'SELF', 'OTHER'] },
                        whoLivesWithOther: { type: 'string' },
                        guardianName: { type: 'string' },
                        guardianPhone: { type: 'string' },
                        guardianOccupation: { type: 'string' },
                        householdIncomeRange: { type: 'string', enum: ['BELOW_5K', 'FROM_5K_TO_15K', 'FROM_15K_TO_30K', 'ABOVE_30K'] },
                        numberOfDependents: { type: 'integer' },
                        numberOfSiblings: { type: 'integer' },
                        siblingsInSchool: { type: 'integer' },
                        phoneNumber: { type: 'string' },
                        emergencyContactName: { type: 'string' },
                        emergencyContactPhone: { type: 'string' },
                        orphanStatus: { type: 'string', enum: ['BOTH_PARENTS_ALIVE', 'SINGLE_ORPHAN', 'DOUBLE_ORPHAN'] },
                        disabilityStatus: { type: 'boolean' },
                        disabilityType: { type: 'string' },
                        kcseGrade: { type: 'string' },
                        previousScholarship: { type: 'boolean' },
                        previousScholarshipDetails: { type: 'string' }
                    }
                },
                UpdateProfileRequest: {
                    type: 'object',
                    description: 'All fields from CreateProfileRequest, all optional',
                    properties: {
                        fullName: { type: 'string' },
                        dateOfBirth: { type: 'string', format: 'date' },
                        gender: { type: 'string', enum: ['MALE', 'FEMALE', 'OTHER'] }
                    }
                },
                CreateDraftRequest: {
                    type: 'object',
                    properties: {
                        outstandingFeesBalance: { type: 'number' },
                        hardshipNarrative: { type: 'string' },
                        currentYearOfStudy: { type: 'string' },
                        modeOfSponsorship: { type: 'array', items: { type: 'string' } },
                        howSupportingEducation: { type: 'array', items: { type: 'string' } },
                        currentFeeSituation: { type: 'string' },
                        isFeesAffectingStudies: { type: 'boolean' },
                        hasBeenSentHome: { type: 'boolean' },
                        hasMissedExamsOrClasses: { type: 'boolean' },
                        difficultiesFaced: { type: 'array', items: { type: 'string' } },
                        goalForAcademicYear: { type: 'string' },
                        referralSource: { type: 'string' },
                        gpa: { type: 'string' },
                        expectedGraduationDate: { type: 'string', format: 'date' },
                        totalAnnualFeeAmount: { type: 'number' },
                        remainingSemesters: { type: 'integer' },
                        appliedToOtherScholarships: { type: 'boolean' },
                        otherScholarshipsDetails: { type: 'string' },
                        communityInvolvement: { type: 'string' },
                        careerAspirations: { type: 'string' },
                        givingBackPlan: { type: 'string' }
                    }
                },
                UpdateDraftRequest: {
                    type: 'object',
                    description: 'All fields from CreateDraftRequest, all optional'
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
                },
                Institution: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        name: { type: 'string' },
                        type: { type: 'string', enum: ['HIGH_SCHOOL', 'UNIVERSITY', 'COLLEGE', 'TVET'] },
                        county: { type: 'string' },
                        isVerified: { type: 'boolean' }
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
