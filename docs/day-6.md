# Day 6: Household and User Management

## Summary

Day 6 focused on building a comprehensive household and user management system, a critical feature for a collaborative smart home application. This included creating a new `household` service, defining a new `Invitation` model, and implementing a full suite of API endpoints to manage households, members, and invitations.

## Features Implemented

- **Household Management:**
  - CRUD operations for households (Create, Read, Delete).
  - A new `household.service.ts` was created to encapsulate all business logic related to household management.
  - A new `household.controller.ts` and `household.routes.ts` were created to expose the new functionality through a RESTful API.

- **Invitation System:**
  - A new `Invitation` model was created to represent pending invitations.
  - The invitation system allows household owners to invite new users to their household by email.
  - Users can accept or decline invitations.
  - The system uses a unique token for each invitation to ensure security.

- **Role-Based Access Control (RBAC):**
  - Only household owners can invite new users and delete the household.
  - Members can leave a household, but cannot perform administrative tasks.

- **Data Integrity:**
  - Cascading deletion logic was implemented to ensure that when a household is deleted, all associated data (devices, invitations, etc.) is also deleted.
  - MongoDB transactions were used to ensure atomicity of complex operations like user registration, household deletion, and invitation acceptance.

## New Database Schema

### `Invitation` Model

The `Invitation` model was introduced to store information about pending invitations.

```typescript
// src/models/Invitation.ts
import { Schema, model, Document, Types } from 'mongoose';

export interface IInvitation extends Document {
  _id: Types.ObjectId;
  household: Types.ObjectId;
  inviter: Types.ObjectId;
  inviteeEmail: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const InvitationSchema = new Schema<IInvitation>({
  household: {
    type: Schema.Types.ObjectId,
    ref: 'Household',
    required: true,
  },
  inviter: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  inviteeEmail: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  token: {
    type: String,
    required: true,
    unique: true,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
}, {
  timestamps: true,
});

InvitationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Invitation = model<IInvitation>('Invitation', InvitationSchema);

export default Invitation;
```

## New API Endpoints

The following endpoints were added to manage households and invitations:

- `GET /households`: Get all households for the authenticated user.
- `GET /households/:id`: Get a single household by ID.
- `DELETE /households/:id`: Delete a household (Owner only).
- `POST /households/invite`: Invite a user to a household (Owner only).
- `GET /households/invitations`: Get all pending invitations for the authenticated user.
- `POST /households/invitations/accept`: Accept a household invitation.
- `POST /households/invitations/decline`: Decline a household invitation.
- `POST /households/leave`: Leave a household.

## Validation and Testing

A series of validation tests were performed to ensure the new functionality is working as expected. The tests covered:

- Registering new users.
- Logging in and obtaining access tokens.
- Inviting a user to a household.
- Checking for pending invitations.
- Accepting and declining invitations.
- Verifying household membership.
- Testing role-based access control for leaving and deleting households.

During the testing process, several issues were identified and fixed, including:

- Incorrect route ordering in `household.routes.ts`.
- Use of `.lean()` in service functions, which caused issues with Mongoose document methods.
- Missing validation for `householdName` during user registration.
- Several TypeScript and ESLint errors.

After fixing these issues, all validation tests were completed successfully.

## Conclusion

Day 6 was a major step forward in the development of the smart home API. The implementation of household and user management with a secure invitation system provides a solid foundation for a collaborative, multi-user application. The successful completion of the validation tests demonstrates the robustness and reliability of the new features.
