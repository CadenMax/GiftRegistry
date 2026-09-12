import { AlertTriangle, LoaderCircle, RefreshCw, Trash2, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { getAdminPeople, removeAdminPerson, type AdminPerson } from "../lib/accountStore";

type AdminPeopleProps = { onChanged?: () => void };

function normaliseName(name: string) {
  return name.toLocaleLowerCase().replace(/[^a-z0-9]/g, "");
}

function editDistance(left: string, right: string) {
  const grid = Array.from({ length: left.length + 1 }, (_, row) =>
    Array.from({ length: right.length + 1 }, (_, column) => row === 0 ? column : column === 0 ? row : 0),
  );
  for (let row = 1; row <= left.length; row += 1) {
    for (let column = 1; column <= right.length; column += 1) {
      const substitution = grid[row - 1][column - 1] + (left[row - 1] === right[column - 1] ? 0 : 1);
      grid[row][column] = Math.min(grid[row - 1][column] + 1, grid[row][column - 1] + 1, substitution);
      if (row > 1 && column > 1 && left[row - 1] === right[column - 2] && left[row - 2] === right[column - 1]) {
        grid[row][column] = Math.min(grid[row][column], grid[row - 2][column - 2] + 1);
      }
    }
  }
  return grid[left.length][right.length];
}

function looksLikeDuplicate(person: AdminPerson, people: AdminPerson[]) {
  const name = normaliseName(person.name);
  if (name.length < 3) return false;
  return people.some((other) => other.id !== person.id && editDistance(name, normaliseName(other.name)) <= 1);
}

function formatLastSeen(timestamp?: string | null) {
  if (!timestamp) return "No recent activity";
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? "No recent activity" : `Last seen ${date.toLocaleString()}`;
}

export function AdminPeople({ onChanged }: AdminPeopleProps) {
  const [people, setPeople] = useState<AdminPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [removingId, setRemovingId] = useState("");

  const loadPeople = async () => {
    setLoading(true);
    setError("");
    try {
      setPeople(await getAdminPeople());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load list participants.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    getAdminPeople()
      .then((nextPeople) => {
        if (!cancelled) setPeople(nextPeople);
      })
      .catch((loadError: unknown) => {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Unable to load list participants.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const removePerson = async (person: AdminPerson) => {
    const noun = person.type === "account" ? "account's participation" : "guest profile";
    if (!window.confirm(`Remove ${person.name}'s ${noun} from your lists? This will not delete their account.`)) return;
    setRemovingId(person.id);
    setError("");
    try {
      await removeAdminPerson(person);
      setPeople((current) => current.filter((candidate) => !(candidate.id === person.id && candidate.type === person.type)));
      onChanged?.();
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Unable to remove this person.");
    } finally {
      setRemovingId("");
    }
  };

  return (
    <section className="admin-people" aria-labelledby="admin-people-title">
      <div className="admin-people-heading">
        <div>
          <span className="eyebrow">List administration</span>
          <h2 id="admin-people-title">People on your lists</h2>
        </div>
        <button aria-label="Refresh people" className="icon-button" onClick={() => void loadPeople()} title="Refresh people" type="button"><RefreshCw size={16} /></button>
      </div>
      {error ? <p className="error-message">{error}</p> : null}
      {loading ? <p className="admin-people-empty"><LoaderCircle className="spin" size={17} /> Loading participants...</p> : null}
      {!loading && people.length === 0 ? <p className="admin-people-empty">No participants have appeared on your lists yet.</p> : null}
      <div className="admin-people-list">
        {people.map((person) => {
          const possibleDuplicate = looksLikeDuplicate(person, people);
          return (
            <article className="admin-person" key={`${person.type}:${person.id}`}>
              <span className="avatar">{person.avatarUrl ? <img alt="" src={person.avatarUrl} /> : <UserRound size={15} />}</span>
              <div className="admin-person-details">
                <strong>{person.name}</strong>
                <span>{person.email ?? "Guest profile"}</span>
                <small>{person.type === "account" ? "Account" : "Guest"} · appeared on {person.listCount} {person.listCount === 1 ? "list" : "lists"} · {formatLastSeen(person.lastSeenAt)}</small>
              </div>
              {possibleDuplicate ? <span className="admin-duplicate" title="This name is similar to another participant"><AlertTriangle size={14} /> Possible duplicate</span> : null}
              <button aria-label={`Remove ${person.name}`} className="delete-button" disabled={removingId === person.id} onClick={() => void removePerson(person)} title="Remove from my lists" type="button">
                {removingId === person.id ? <LoaderCircle className="spin" size={16} /> : <Trash2 size={16} />}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
