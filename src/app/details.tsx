import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { ProductForm } from '@/components/ProductForm';
import { copyToComputer } from '@/lib/computer-sync';
import { clearDraft, getDraft } from '@/lib/draft';
import { createId, errorMessage, makeImageName } from '@/lib/format';
import { useInventory } from '@/lib/inventory-context';
import { deletePhoto, persistPhoto } from '@/lib/storage';
import type { ItemDetails } from '@/lib/types';
import { colors } from '@/theme';

export default function DetailsScreen() {
  const draft = getDraft();
  const { addProduct, findByUpc } = useInventory();
  const [busy, setBusy] = useState(false);

  if (!draft.active || !draft.tempImageUri) {
    return <Redirect href="/" />;
  }

  const tempImageUri = draft.tempImageUri;

  async function save(details: ItemDetails) {
    if (busy) return;
    if (draft.upc && findByUpc(draft.upc)) {
      Alert.alert('Already logged', 'This barcode was saved before this photo. Back out and scan it again to see the existing item.');
      return;
    }

    const id = createId();
    const imageName = makeImageName(details, id);
    const now = new Date().toISOString();
    setBusy(true);
    try {
      await persistPhoto(tempImageUri, imageName);
      try {
        addProduct({
          id,
          upc: draft.upc,
          imageName,
          category: details.category,
          department: details.department,
          audience: details.audience,
          sport: details.sport,
          size: details.size,
          color: details.color,
          brand: details.brand,
          quantity: details.quantity,
          notes: details.notes,
          createdAt: now,
          updatedAt: now,
        });
      } catch (error) {
        deletePhoto(imageName);
        throw error;
      }
      clearDraft();
      const copied = await copyToComputer({ imageNames: [imageName] });
      if (!copied.ok) {
        Alert.alert('Saved on this phone', copied.message, [
          { text: 'OK', onPress: () => router.dismissTo('/') },
        ]);
        return;
      }
      router.dismissTo('/');
    } catch (error) {
      Alert.alert('Could not save item', errorMessage(error));
      setBusy(false);
    }
  }

  return (
    <View style={styles.screen}>
      <ProductForm
        busy={busy}
        imageUri={tempImageUri}
        initial={{
          upc: draft.upc,
          category: '',
          department: '',
          audience: '',
          sport: '',
          size: '',
          color: '',
          brand: '',
          quantity: 1,
          notes: '',
        }}
        onReplacePhoto={() => router.back()}
        onRescan={() => router.dismissTo('/scan')}
        onSubmit={(details) => void save(details)}
        submitLabel="Save item"
        upc={draft.upc}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.bg,
    flex: 1,
  },
});
