import { z } from "zod";

export const studentIdSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9]{6,20}$/, "학번은 영문/숫자 6~20자여야 합니다.");

export const passwordSchema = z
  .string()
  .min(8, "비밀번호는 8자 이상이어야 합니다.")
  .max(72, "비밀번호는 72자 이하여야 합니다.")
  .regex(/[A-Za-z]/, "비밀번호에 영문자를 포함해야 합니다.")
  .regex(/[0-9]/, "비밀번호에 숫자를 포함해야 합니다.");

export const emailSchema = z.string().trim().toLowerCase().email("올바른 이메일 주소를 입력해 주세요.").max(254);

export const signupStartSchema = z.object({
  studentId: studentIdSchema,
  name: z.string().trim().min(1, "이름을 입력해 주세요.").max(30),
  email: emailSchema,
  password: passwordSchema,
});

export const signupVerifySchema = z.object({
  email: emailSchema,
  code: z.string().trim().regex(/^\d{6}$/, "6자리 숫자를 입력해 주세요."),
});

export const loginSchema = z.object({
  studentId: studentIdSchema,
  password: z.string().min(1).max(72),
});

const coordSchema = z.object({
  name: z.string().trim().min(1).max(50),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const rideCreateSchema = z
  .object({
    origin: coordSchema,
    destination: coordSchema,
    departAt: z.coerce.date(),
    capacity: z.coerce.number().int().min(2).max(4),
    note: z.string().trim().max(200).optional().default(""),
  })
  .refine((data) => data.departAt.getTime() > Date.now() - 60_000, {
    message: "출발 시각은 현재 이후여야 합니다.",
    path: ["departAt"],
  });

export const messageSchema = z.object({
  content: z.string().trim().min(1, "메시지를 입력해 주세요.").max(1000),
});
