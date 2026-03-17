/**
 * DEPRECADO — mantenido solo como referencia.
 * Usar checkAbility() de ./ability.ts en su lugar.
 *
 * La función anterior hacía una query a la DB por cada resolver.
 * Ahora los permisos se leen directamente del JWT (context.user.permissions)
 * y se evalúan con CASL sin tocar la base de datos.
 */
export {};
