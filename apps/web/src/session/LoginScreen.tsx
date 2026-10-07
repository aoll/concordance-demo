import { LoginBody } from '@concordance/api-client/zod';
import { type FormEvent, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLoginByPseudo } from './useSession';

/** Pas de vraie auth pour la démo : un pseudo suffit (la cible serait le SSO RATP en OIDC). */
export function LoginScreen() {
  const login = useLoginByPseudo();
  const [displayName, setDisplayName] = useState('');
  // Même schéma Zod que le DTO de l'API, généré par Orval : la règle n'est écrite qu'une fois.
  const parsed = LoginBody.safeParse({ displayName: displayName.trim() });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (parsed.success) login.mutate({ data: parsed.data });
  };

  return (
    <Card className="mx-auto mt-[12vh] w-[calc(100%-2rem)] max-w-sm">
      <CardHeader>
        <CardTitle>
          <h1 className="font-heading text-2xl leading-tight font-bold">Bienvenue</h1>
        </CardTitle>
        <CardDescription>Choisissez un pseudo pour vous inscrire sur une zone.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-4" onSubmit={submit}>
          <div className="flex flex-col gap-2">
            <Label htmlFor="displayName">Pseudo</Label>
            <Input
              id="displayName"
              name="displayName"
              autoComplete="nickname"
              className="h-11"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              minLength={2}
              maxLength={40}
              required
            />
          </div>
          <Button
            type="submit"
            size="lg"
            className="h-11 w-full"
            disabled={!parsed.success || login.isPending}
          >
            Entrer
          </Button>
          {login.isError && (
            <Alert variant="destructive">
              <AlertDescription>Connexion impossible. Réessayez.</AlertDescription>
            </Alert>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
