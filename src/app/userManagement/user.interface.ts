/**
 * User Interface
 * --------------
 * Represents the structure of a user object within the application.
 * This model is used for registration, authentication, user profile updates,
 * and storage of user-related metadata in services or databases.
 *
 * Fields:
 * - `id` (optional): Unique identifier for the user (e.g., from a database like Firebase).
 * - `name`: The user's full name entered during sign-up.
 * - `email`: The user's email address, used for login and communication.
 * - `password`: The user's password (may be omitted or encrypted in secure contexts).
 * - `status`: Indicates if the user is currently active or verified.
 * - `channelIds`: A dictionary of channel IDs the user is a member of. Each entry has a value of `true`.
 * - `picture`: Path or URL to the user's avatar/profile picture.
 * - `displayName` (optional): A user-friendly display name, if different from `name`.
 */
export interface User {
    id?: string;
    name: string;
    email: string;
    password: string;
    status: boolean;
    channelIds: { [channelId: string]: true },
    picture: string,
    displayName?: string;
}