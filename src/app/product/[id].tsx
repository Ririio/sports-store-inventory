import { router, useLocalSearchParams } from 'expo-router';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/Buttons';
import { ProductForm } from '@/components/ProductForm';
import { copyToComputer } from '@/lib/computer-sync';
import { errorMessage, makeImageName, oneParam } from '@/lib/format';
import { useInventory } from '@/lib/inventory-context';
import { copyPhoto, deletePhoto, photoUri } from '@/lib/storage';
import type { ItemDetails, Product } from '@/lib/types';
import { colors } from '@/theme';

export default function ProductScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = oneParam(params.id);
  const { products, updateProduct, deleteProduct, findByUpc } = useInventory();
  const product = products.find((item) => item.id === id);

  if (!product) {
    return (
      <View style={styles.missing}>
        <Text style={styles.missingTitle}>This item is no longer in the inventory.</Text>
        <PrimaryButton label="Back to inventory" onPress={() => router.replace('/')} />
      </View>
    );
  }

  async function save(current: Product, details: ItemDetails) {
    if (details.upc) {
      const match = findByUpc(details.upc);
      if (match && match.id !== current.id) {
        Alert.alert('Already logged', 'Another item already uses this UPC.');
        return;
      }
    }
    const imageName = makeImageName(details, current.id);
    const renamed = imageName !== current.imageName;
    try {
      if (renamed) await copyPhoto(current.imageName, imageName);
      try {
        updateProduct({
          ...current,
          upc: details.upc,
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
          updatedAt: new Date().toISOString(),
        });
      } catch (error) {
        if (renamed) deletePhoto(imageName);
        throw error;
      }
      if (renamed) deletePhoto(current.imageName);
      const copied = await copyToComputer({
        imageNames: renamed ? [imageName] : [],
        deleteNames: renamed ? [current.imageName] : [],
      });
      if (!copied.ok) {
        Alert.alert('Saved on this phone', 'The computer spreadsheet was not updated. Leave Expo running and use Save photos on computer from the inventory screen.');
      }
      if (router.canGoBack()) router.back();
      else router.replace('/');
    } catch (error) {
      Alert.alert('Could not save changes', errorMessage(error));
    }
  }

  function remove(current: Product) {
    Alert.alert('Delete this item?', 'The photo and log entry will be removed from this phone and from the computer folder while Expo is running.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              deleteProduct(current.id);
              deletePhoto(current.imageName);
              const copied = await copyToComputer({ imageNames: [], deleteNames: [current.imageName] });
              if (!copied.ok) {
                Alert.alert('Removed from this phone', 'The copy on the computer could not be deleted. Leave Expo running and try again.');
              }
              if (router.canGoBack()) router.back();
              else router.replace('/');
            } catch (error) {
              Alert.alert('Could not delete item', errorMessage(error));
            }
          })();
        },
      },
    ]);
  }

  return (
    <View style={styles.screen}>
      <ProductForm
        imageUri={photoUri(product.imageName)}
        initial={product}
        key={product.id}
        onDelete={() => remove(product)}
        onReplacePhoto={() =>
          router.push({ pathname: '/photo', params: { productId: product.id } })
        }
        onSubmit={(details) => void save(product, details)}
        submitLabel="Save changes"
        upc={product.upc}
        upcEditable
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.bg,
    flex: 1,
  },
  missing: {
    backgroundColor: colors.bg,
    flex: 1,
    gap: 16,
    justifyContent: 'center',
    padding: 24,
  },
  missingTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
  },
});
