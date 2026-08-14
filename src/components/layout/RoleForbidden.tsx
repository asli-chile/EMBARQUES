type RoleForbiddenProps = {
  message?: string;
};

export function RoleForbidden({
  message = "No tienes acceso a esta sección con tu rol actual.",
}: RoleForbiddenProps) {
  return (
    <main className="flex-1 min-h-0 overflow-auto bg-neutral-100 p-6 flex items-center justify-center" role="main">
      <p className="text-neutral-600 text-center max-w-md">{message}</p>
    </main>
  );
}
