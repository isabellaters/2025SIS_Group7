import { gql } from 'apollo-server-express';

export const typeDefs = gql`
  type User {
    id: ID!
    uid: String!
    email: String!
    displayName: String
    role: String!
    createdAt: String!
    updatedAt: String!
  }

  type Lecture {
    id: ID!
    title: String!
    description: String
    instructorId: String!
    instructor: User!
    status: LectureStatus!
    startTime: String
    endTime: String
    recordingUrl: String
    subtitles: [Subtitle!]!
    participants: [User!]!
    createdAt: String!
    updatedAt: String!
  }

  type Subtitle {
    id: ID!
    lectureId: String!
    startTime: Float!
    endTime: Float!
    text: String!
    language: String!
    confidence: Float
    isAI: Boolean!
    createdAt: String!
  }

  type AIAnalysis {
    id: ID!
    lectureId: String!
    type: AnalysisType!
    content: String!
    confidence: Float
    createdAt: String!
  }

  type ChatMessage {
    id: ID!
    lectureId: String!
    userId: String!
    user: User!
    message: String!
    timestamp: String!
    isAI: Boolean!
  }

  type FileUpload {
    id: ID!
    filename: String!
    originalName: String!
    mimeType: String!
    size: Int!
    url: String!
    uploadedBy: String!
    uploadedAt: String!
  }

  enum LectureStatus {
    SCHEDULED
    LIVE
    RECORDED
    ARCHIVED
  }

  enum AnalysisType {
    SUMMARY
    TRANSLATION
    SENTIMENT
    EXTRACTION
  }

  input CreateLectureInput {
    title: String!
    description: String
    startTime: String
    instructorId: String!
  }

  input UpdateLectureInput {
    title: String
    description: String
    status: LectureStatus
    startTime: String
    endTime: String
    recordingUrl: String
  }

  input CreateSubtitleInput {
    lectureId: String!
    startTime: Float!
    endTime: Float!
    text: String!
    language: String!
    confidence: Float
    isAI: Boolean
  }

  input AIAnalysisInput {
    lectureId: String!
    type: AnalysisType!
    content: String!
  }

  input ChatMessageInput {
    lectureId: String!
    message: String!
  }

  type Query {
    # User queries
    me: User
    user(id: ID!): User
    users: [User!]!

    # Lecture queries
    lectures: [Lecture!]!
    lecture(id: ID!): Lecture
    myLectures: [Lecture!]!
    scheduledLectures: [Lecture!]!
    liveLectures: [Lecture!]!

    # Subtitle queries
    subtitles(lectureId: ID!): [Subtitle!]!
    subtitle(id: ID!): Subtitle

    # AI Analysis queries
    aiAnalyses(lectureId: ID!): [AIAnalysis!]!
    aiAnalysis(id: ID!): AIAnalysis

    # Chat queries
    chatMessages(lectureId: ID!): [ChatMessage!]!

    # File queries
    files: [FileUpload!]!
    file(id: ID!): FileUpload
  }

  type Mutation {
    # User mutations
    updateProfile(displayName: String, role: String): User!

    # Lecture mutations
    createLecture(input: CreateLectureInput!): Lecture!
    updateLecture(id: ID!, input: UpdateLectureInput!): Lecture!
    deleteLecture(id: ID!): Boolean!
    joinLecture(lectureId: ID!): Lecture!
    leaveLecture(lectureId: ID!): Boolean!

    # Subtitle mutations
    createSubtitle(input: CreateSubtitleInput!): Subtitle!
    updateSubtitle(id: ID!, text: String!, startTime: Float, endTime: Float): Subtitle!
    deleteSubtitle(id: ID!): Boolean!
    generateSubtitles(lectureId: ID!, language: String): [Subtitle!]!

    # AI Analysis mutations
    createAIAnalysis(input: AIAnalysisInput!): AIAnalysis!
    analyzeContent(content: String!, type: AnalysisType!): String!
    generateSummary(lectureId: ID!): String!

    # Chat mutations
    sendMessage(input: ChatMessageInput!): ChatMessage!
    sendAIMessage(lectureId: ID!, message: String!): ChatMessage!

    # File mutations
    uploadFile(file: Upload!): FileUpload!
    deleteFile(id: ID!): Boolean!
  }

  type Subscription {
    # Real-time subscriptions
    lectureUpdated(lectureId: ID!): Lecture!
    subtitleAdded(lectureId: ID!): Subtitle!
    subtitleUpdated(lectureId: ID!): Subtitle!
    chatMessageAdded(lectureId: ID!): ChatMessage!
    userJoined(lectureId: ID!): User!
    userLeft(lectureId: ID!): User!
  }

  scalar Upload
`;
