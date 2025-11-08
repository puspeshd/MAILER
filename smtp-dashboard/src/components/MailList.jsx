import React from "react";

export default function MailList({ templates, onEdit }) {
  if (!templates.length) return <p>No saved templates yet.</p>;

  return (
    <table className="min-w-full border">
      <thead>
        <tr className="bg-gray-200">
          <th className="p-2 border">Title</th>
          <th className="p-2 border">Actions</th>
        </tr>
      </thead>
      <tbody>
        {templates.map((mail) => (
          <tr key={mail.id}>
            <td className="p-2 border">{mail.title}</td>
            <td className="p-2 border">
              <button
                className="text-blue-600 underline"
                onClick={() => onEdit(mail)}
              >
                Edit
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
