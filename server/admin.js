import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { db } from "./db.js";

const ROLES = new Set([
  "doctor",
  "director",
  "hod",
  "accommodation",
  "mandir",
  "travel",
  "it",
  "admin",
]);

function validateRole(role) {
  const value = String(
    role || "",
  )
    .trim()
    .toLowerCase();

  if (!ROLES.has(value)) {
    throw new Error(
      "Invalid account role.",
    );
  }

  return value;
}

function clean(value) {
  return String(
    value ?? "",
  ).trim();
}

/**
 * Get every account in the system.
 */
export async function listAdminUsers() {
  const result =
    await db.query(`
      SELECT
        u.id,
        u.email,
        u.role,
        u.active,
        u.created_at,

        p.full_name,
        p.department,
        p.institution,

        d.status AS doctor_status,
        d.department_route,
        d.reviewed_at

      FROM users u

      LEFT JOIN profiles p
        ON p.user_id = u.id

      LEFT JOIN doctors d
        ON d.user_id = u.id

      ORDER BY
        u.created_at DESC
    `);

  return result.rows;
}

/**
 * Update a user account.
 */
export async function updateAdminUser({
  id,
  actorUserId,
  email,
  fullName,
  role,
  department,
  institution,
  active,
}) {
  if (!id) {
    throw new Error(
      "User ID is required.",
    );
  }

  /*
   * Admin must not disable their
   * own account.
   */
  if (
    id === actorUserId &&
    active === false
  ) {
    throw new Error(
      "You cannot deactivate your own Admin account.",
    );
  }

  const roleValue =
    role === undefined
      ? undefined
      : validateRole(role);

  const emailValue =
    email === undefined
      ? undefined
      : clean(email).toLowerCase();

  const fullNameValue =
    fullName === undefined
      ? undefined
      : clean(fullName);

  const departmentValue =
    department === undefined
      ? undefined
      : clean(department);

  const institutionValue =
    institution === undefined
      ? undefined
      : clean(institution);

  return db.withTransaction(
    async (client) => {
      const existing =
        await client.query(
          `
            SELECT *
            FROM users
            WHERE id=$1
            FOR UPDATE
          `,
          [id],
        );

      if (!existing.rowCount) {
        throw new Error(
          "Account not found.",
        );
      }

      /*
       * Prevent duplicate emails.
       */
      if (
        emailValue &&
        emailValue !==
          existing.rows[0].email
      ) {
        const duplicate =
          await client.query(
            `
              SELECT 1
              FROM users
              WHERE lower(email)=lower($1)
                AND id<>$2
            `,
            [
              emailValue,
              id,
            ],
          );

        if (duplicate.rowCount) {
          throw new Error(
            "Another account already uses this email.",
          );
        }
      }

      await client.query(
        `
          UPDATE users
          SET
            email=COALESCE($1,email),
            role=COALESCE($2,role),
            active=COALESCE(
              $3,
              active
            )

          WHERE id=$4
        `,
        [
          emailValue ||
            null,
          roleValue ||
            null,
          active ===
          undefined
            ? null
            : Boolean(active),
          id,
        ],
      );

      /*
       * Keep profile metadata
       * synchronized.
       */
      await client.query(
        `
          INSERT INTO profiles(
            user_id,
            full_name,
            department,
            institution
          )

          VALUES(
            $1,
            $2,
            $3,
            $4
          )

          ON CONFLICT(user_id)

          DO UPDATE SET
            full_name=COALESCE(
              $2,
              profiles.full_name
            ),

            department=COALESCE(
              $3,
              profiles.department
            ),

            institution=COALESCE(
              $4,
              profiles.institution
            ),

            updated_at=NOW()
        `,
        [
          id,
          fullNameValue ||
            null,
          departmentValue ||
            null,
          institutionValue ||
            null,
        ],
      );

      /*
       * Return updated account.
       */
      const updated =
        await client.query(
          `
            SELECT
              u.id,
              u.email,
              u.role,
              u.active,
              u.created_at,

              p.full_name,
              p.department,
              p.institution

            FROM users u

            LEFT JOIN profiles p
              ON p.user_id =
                 u.id

            WHERE u.id=$1
          `,
          [id],
        );

      /*
       * Audit the action.
       */
      await client.query(
        `
          INSERT INTO audit(
            id,
            subject_type,
            subject_id,
            actor_user_id,
            action,
            note,
            metadata
          )

          VALUES(
            gen_random_uuid(),
            'user_account',
            $1,
            $2,
            'admin_updated',
            'Account settings updated',
            $3
          )
        `,
        [
          id,
          actorUserId,
          JSON.stringify({
            email:
              emailValue,
            role:
              roleValue,
            active,
          }),
        ],
      );

      return updated
        .rows[0];
    },
  );
}

/**
 * Reset an account password.
 */
export async function resetAdminUserPassword({
  id,
  actorUserId,
  password,
}) {
  if (!id) {
    throw new Error(
      "User ID is required.",
    );
  }

  if (
    !password ||
    password.length < 8
  ) {
    throw new Error(
      "Password must be at least 8 characters.",
    );
  }

  const passwordHash =
    await bcrypt.hash(
      password,
      12,
    );

  return db.withTransaction(
    async (client) => {
      const result =
        await client.query(
          `
            UPDATE users

            SET
              password_hash=$1,
              active=TRUE

            WHERE id=$2

            RETURNING
              id,
              email,
              role,
              active
          `,
          [
            passwordHash,
            id,
          ],
        );

      if (!result.rowCount) {
        throw new Error(
          "Account not found.",
        );
      }

      await client.query(
        `
          INSERT INTO audit(
            id,
            subject_type,
            subject_id,
            actor_user_id,
            action,
            note,
            metadata
          )

          VALUES(
            gen_random_uuid(),
            'user_account',
            $1,
            $2,
            'admin_password_reset',
            'Password reset by Admin',
            $3
          )
        `,
        [
          id,
          actorUserId,
          JSON.stringify({
            forced_active:
              true,
          }),
        ],
      );

      return result
        .rows[0];
    },
  );
}

/**
 * Permanently delete an account.
 *
 * Prevent:
 * - self-deletion
 * - deleting the last active Admin
 */
export async function deleteAdminUser({
  id,
  actorUserId,
}) {
  if (!id) {
    throw new Error(
      "User ID is required.",
    );
  }

  if (id === actorUserId) {
    throw new Error(
      "You cannot permanently delete the account you are currently using.",
    );
  }

  return db.withTransaction(
    async (client) => {
      const existing =
        await client.query(
          `
            SELECT
              id,
              email,
              role

            FROM users

            WHERE id=$1

            FOR UPDATE
          `,
          [id],
        );

      if (!existing.rowCount) {
        throw new Error(
          "Account not found.",
        );
      }

      /*
       * Never allow the final
       * active Admin to disappear.
       */
      if (
        existing.rows[0]
          .role === "admin"
      ) {
        const count =
          await client.query(
            `
              SELECT
                COUNT(*)::int AS count

              FROM users

              WHERE
                role='admin'

                AND active=TRUE

                AND id<>$1
            `,
            [id],
          );

        if (
          count.rows[0].count <
          1
        ) {
          throw new Error(
            "The last active Admin account cannot be permanently deleted.",
          );
        }
      }

      /*
       * Remove dependent review
       * ownership.
       */
      await client.query(
        `
          DELETE FROM
            review_messages

          WHERE
            author_user_id=$1
        `,
        [id],
      );

      await client.query(
        `
          DELETE FROM
            review_threads

          WHERE
            doctor_user_id=$1

            OR created_by=$1

            OR resolved_by=$1
        `,
        [id],
      );

      /*
       * Preserve audit history,
       * but detach the deleted user.
       */
      await client.query(
        `
          UPDATE audit

          SET actor_user_id=NULL

          WHERE actor_user_id=$1
        `,
        [id],
      );

      await client.query(
        `
          UPDATE documents

          SET verified_by=NULL

          WHERE verified_by=$1
        `,
        [id],
      );

      /*
       * Delete user.
       *
       * Related rows using
       * ON DELETE CASCADE will
       * disappear automatically.
       */
      await client.query(
        `
          DELETE FROM users

          WHERE id=$1
        `,
        [id],
      );

      /*
       * Preserve a deletion
       * audit record.
       */
      await client.query(
        `
          INSERT INTO audit(
            id,
            subject_type,
            subject_id,
            actor_user_id,
            action,
            note,
            metadata
          )

          VALUES(
            gen_random_uuid(),
            'user_account',
            $1,
            $2,
            'admin_deleted',
            'User account permanently deleted',
            $3
          )
        `,
        [
          id,
          actorUserId,
          JSON.stringify({
            deleted_email:
              existing.rows[0]
                .email,

            deleted_role:
              existing.rows[0]
                .role,
          }),
        ],
      );

      return existing
        .rows[0];
    },
  );
}

/**
 * Generate a temporary password.
 */
export function generateTemporaryPassword() {
  const raw =
    randomUUID()
      .replaceAll("-", "")
      .slice(0, 12);

  return `${raw.slice(
    0,
    4,
  )}!${raw.slice(
    4,
    10,
  )}${raw.slice(10)}`;
}