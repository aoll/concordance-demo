import { LoginBody } from '@concordance/api-client/zod';
import { type FormEvent, useState } from 'react';
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
    <form className="login" onSubmit={submit}>
      <h1>Bienvenue</h1>
      <p className="hint">Choisissez un pseudo pour vous inscrire sur une zone.</p>
      <label>
        Pseudo
        <input
          name="displayName"
          autoComplete="nickname"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          minLength={2}
          maxLength={40}
          required
        />
      </label>
      <button type="submit" className="btn" disabled={!parsed.success || login.isPending}>
        Entrer
      </button>
      {login.isError && (
        <p className="err" role="alert">
          Connexion impossible. Réessayez.
        </p>
      )}
    </form>
  );
}
