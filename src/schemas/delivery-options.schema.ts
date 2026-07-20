import { z } from "zod";

const identifierSchema = z
  .string()
  .trim()
  .min(1, "El identificador es obligatorio")
  .max(120, "El identificador es demasiado largo")
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "El identificador debe usar minusculas, numeros y guiones");

const nameSchema = z.string().trim().min(1, "El nombre es obligatorio").max(150);
const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "La hora debe usar el formato HH:mm");

function hasUniqueValues(values: string[]) {
  const normalized = values.map((value) => value.trim().toLocaleLowerCase("es"));
  return new Set(normalized).size === normalized.length;
}

const pickupPointSchema = z.object({
  id: identifierSchema,
  name: nameSchema,
});

const pickupScheduleSchema = z
  .object({
    id: identifierSchema,
    day: nameSchema.max(30),
    start: timeSchema,
    end: timeSchema,
    label: nameSchema.max(200),
  })
  .refine((schedule) => schedule.start < schedule.end, {
    message: "La hora final debe ser posterior a la hora inicial",
    path: ["end"],
  });

const departmentSchema = z
  .object({
    name: nameSchema.max(80),
    branches: z.array(nameSchema.max(200)).max(200),
  })
  .refine((department) => hasUniqueValues(department.branches), {
    message: "Las sucursales no pueden estar duplicadas",
    path: ["branches"],
  });

const shippingCompanySchema = z
  .object({
    id: identifierSchema,
    name: nameSchema,
    departments: z.array(departmentSchema).max(50),
  })
  .refine((company) => hasUniqueValues(company.departments.map((item) => item.name)), {
    message: "Los departamentos no pueden estar duplicados",
    path: ["departments"],
  });

export const deliveryOptionsSchema = z
  .object({
    pickupPoints: z.array(pickupPointSchema).max(200),
    pickupSchedules: z.array(pickupScheduleSchema).max(200),
    shippingCompanies: z.array(shippingCompanySchema).max(100),
  })
  .superRefine((options, context) => {
    const sections: Array<["pickupPoints" | "pickupSchedules" | "shippingCompanies", string[]]> = [
      ["pickupPoints", options.pickupPoints.map((item) => item.id)],
      ["pickupSchedules", options.pickupSchedules.map((item) => item.id)],
      ["shippingCompanies", options.shippingCompanies.map((item) => item.id)],
    ];

    for (const [section, ids] of sections) {
      if (!hasUniqueValues(ids)) {
        context.addIssue({
          code: "custom",
          message: "Los identificadores no pueden estar duplicados",
          path: [section],
        });
      }
    }
  });

export type DeliveryOptionsInput = z.infer<typeof deliveryOptionsSchema>;
