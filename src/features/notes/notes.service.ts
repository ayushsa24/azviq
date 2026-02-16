export type NoteEntity = {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
};

export async function listNotes(): Promise<NoteEntity[]> {
  return [];
}

export async function createNote(note: Omit<NoteEntity, "id" | "createdAt">): Promise<NoteEntity> {
  return {
    id: Date.now().toString(),
    title: note.title,
    content: note.content,
    createdAt: new Date(),
  };
}
