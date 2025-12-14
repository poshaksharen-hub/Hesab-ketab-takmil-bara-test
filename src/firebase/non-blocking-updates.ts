
'use client';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  type CollectionReference,
  type DocumentReference,
  type UpdateData,
  type WithFieldValue,
  type DocumentData,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/**
 * A non-blocking function to add a document to a Firestore collection.
 * It immediately returns and handles the async operation in the background.
 *
 * @param collectionRef Reference to the Firestore collection.
 * @param data The data for the new document.
 * @param onSuccess Optional callback that receives the new document's ID on success.
 */
export function addDocumentNonBlocking<T extends WithFieldValue<DocumentData>>(
  collectionRef: CollectionReference<T>,
  data: T,
  onSuccess?: (id: string) => void
): void {
  // Use a temporary object for the addDoc call to satisfy types,
  // even though Firestore will add the server-generated fields.
  const dataForAdd = { ...data };

  addDoc(collectionRef, dataForAdd)
    .then(docRef => {
      if (onSuccess) {
        onSuccess(docRef.id);
      }
    })
    .catch(serverError => {
      const permissionError = new FirestorePermissionError({
        path: collectionRef.path,
        operation: 'create',
        requestResourceData: data,
      });
      errorEmitter.emit('permission-error', permissionError);
    });
}

/**
 * A non-blocking function to update a document in Firestore.
 * It immediately returns and handles the async operation in the background.
 *
 * @param documentRef Reference to the Firestore document.
 * @param data The data to update in the document.
 * @param onSuccess Optional callback executed on successful update.
 */
export function updateDocumentNonBlocking<T extends DocumentData>(
  documentRef: DocumentReference<T>,
  data: UpdateData<T>,
  onSuccess?: () => void
): void {
  updateDoc(documentRef, data)
    .then(() => {
      if (onSuccess) {
        onSuccess();
      }
    })
    .catch(serverError => {
      const permissionError = new FirestorePermissionError({
        path: documentRef.path,
        operation: 'update',
        requestResourceData: data,
      });
      errorEmitter.emit('permission-error', permissionError);
    });
}
