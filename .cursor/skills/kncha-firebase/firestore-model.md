# Firestore model

## users/{uid}

displayName, email, photoUrl, sex, birthDate, sports[], zoneId, score, badges[], status, createdAt, updatedAt

## zones/{zoneId}

name, city, department, active, createdAt, updatedAt

## events/{eventId}

organizerId, sport, capacity, filledCount, visibility, audience, zoneId, approxDate, startsAt?, venueText?, status, inviteCode, pollOpen, conversationId, keepGroupYes/No, keepGroupClosed, createdAt, updatedAt

### events/{eventId}/members/{uid}

role, joinedVia, status, joinedAt, displayName

### events/{eventId}/joinRequests/{requestId}

userId, displayName, status, yesVotes, noVotes, createdAt, updatedAt

### events/{eventId}/joinRequests/{requestId}/votes/{voterUid}

value (yes|no), createdAt

### events/{eventId}/keepGroupVotes/{uid}

value, createdAt

## conversations/{conversationId}

type (event|group), eventId?, title, memberIds[], persisted, createdAt, updatedAt

### conversations/{id}/messages/{messageId}

senderId?, type (user|system), body, createdAt

## groups/{groupId}

conversationId, memberIds[], createdFromEventId, createdAt

## notifications/{id}

userId, type, payload, read, createdAt

## reports/{id}

reporterId, targetType, targetId, reason, status, createdAt, updatedAt
