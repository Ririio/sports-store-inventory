import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton, SecondaryButton } from '@/components/Buttons';
import { copyToComputer } from '@/lib/computer-sync';
import { exportInventory, type ExportKind } from '@/lib/exportInventory';
import { errorMessage, formatWhen, productName } from '@/lib/format';
import { useInventory } from '@/lib/inventory-context';
import { photoUri } from '@/lib/storage';
import type { Product } from '@/lib/types';
import { colors } from '@/theme';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { ready, loadError, products } = useInventory();
  const unitCount = useMemo(() => products.reduce((total, item) => total + item.quantity, 0), [products]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [busyLabel, setBusyLabel] = useState<string | null>(null);

  const categories = useMemo(() => {
    const names = new Set(products.map((product) => product.department || product.category).filter(Boolean));
    return ['All', ...Array.from(names).sort((a, b) => a.localeCompare(b))];
  }, [products]);

  const activeCategory = categories.includes(category) ? category : 'All';

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return products.filter((product) => {
      if (activeCategory !== 'All' && (product.department || product.category) !== activeCategory) return false;
      if (!needle) return true;
      const haystack = [
        productName(product),
        product.upc,
        product.category,
        product.department,
        product.audience,
        product.sport,
        product.size,
        product.color,
        product.brand,
        product.notes,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [products, query, activeCategory]);

  async function runExport(kind: ExportKind) {
    setBusyLabel('Preparing the spreadsheet...');
    try {
      await exportInventory(products, kind);
    } catch (error) {
      Alert.alert('Export failed', errorMessage(error));
    } finally {
      setBusyLabel(null);
    }
  }

  async function copyPhotosToComputer() {
    setBusyLabel('Copying photos to the computer...');
    try {
      const copied = await copyToComputer({
        onProgress: (message) => setBusyLabel(message),
      });
      if (!copied.ok) {
        Alert.alert('Computer copy failed', copied.message);
        return;
      }
      Alert.alert(
        'Photos saved on the computer',
        `${copied.photoCount === 1 ? '1 photo is' : `${copied.photoCount} photos are`} in ${copied.folder}`,
      );
    } catch (error) {
      Alert.alert('Computer copy failed', errorMessage(error));
    } finally {
      setBusyLabel(null);
    }
  }

  function askExport() {
    if (products.length === 0) {
      Alert.alert('Nothing to export', 'Scan a product before creating a spreadsheet.');
      return;
    }
    Alert.alert(
      'Export inventory',
      'Full ZIP exports group photos by department and link them to the spreadsheet and JSON. Photos on your phone stay unchanged.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Save photos on computer', onPress: () => void copyPhotosToComputer() },
        { text: 'Spreadsheet only', onPress: () => void runExport('sheet') },
        { text: 'Full backup (organized photos)', onPress: () => void runExport('zip') },
      ],
    );
  }

  if (!ready) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.navy} size="large" />
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={styles.loading}>
        <Text style={styles.emptyTitle}>Inventory could not be opened</Text>
        <Text style={styles.emptyBody}>{loadError}</Text>
        <Text style={styles.emptyBody}>
          Existing inventory was not changed. Restore a known-good backup before recording more products.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <FlatList
        contentContainerStyle={styles.list}
        data={filtered}
        keyboardShouldPersistTaps="handled"
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          products.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No products yet</Text>
              <Text style={styles.emptyBody}>
                Scan a barcode. If that UPC is new, take a photo and choose a category. If it is already logged, you can back out.
              </Text>
            </View>
          ) : (
            <Text style={styles.noMatch}>No items match that search.</Text>
          )
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.count}>
              {`${products.length} product entries · ${unitCount} total units counted`}
            </Text>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={setQuery}
              placeholder="Search name, UPC, brand..."
              placeholderTextColor={colors.muted}
              style={styles.search}
              value={query}
            />
            <ScrollView
              horizontal
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.filters}
              showsHorizontalScrollIndicator={false}
            >
              {categories.map((item) => {
                const selected = item === activeCategory;
                return (
                  <Pressable
                    key={item}
                    onPress={() => setCategory(item)}
                    style={[styles.filter, selected && styles.filterOn]}
                  >
                    <Text style={[styles.filterText, selected && styles.filterTextOn]}>{item}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        }
        renderItem={({ item }) => <ProductRow product={item} />}
      />

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <SecondaryButton label="Export" onPress={askExport} style={styles.footerButton} />
        <PrimaryButton label="Scan barcode" onPress={() => router.push('/scan')} style={styles.footerButton} />
      </View>

      {busyLabel ? (
        <View style={styles.overlay}>
          <ActivityIndicator color="#fff" size="large" />
          <Text style={styles.overlayText}>{busyLabel}</Text>
        </View>
      ) : null}
    </View>
  );
}

function ProductRow({ product }: { product: Product }) {
  const detail = product.size;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(`/product/${product.id}`)}
      style={styles.row}
    >
      <Image source={{ uri: photoUri(product.imageName) }} style={styles.thumb} />
      <View style={styles.rowBody}>
        <Text style={styles.category}>{productName(product) || 'Unnamed'}</Text>
        <Text style={styles.meta}>{[product.department, product.audience, product.sport].filter(Boolean).join(' · ')}</Text>
        <Text style={styles.meta}>{product.upc ?? 'No barcode'}</Text>
        {detail ? <Text style={styles.meta}>{detail}</Text> : null}
        <Text style={styles.meta}>
          {product.quantity > 1 ? `Qty ${product.quantity} · ` : ''}
          {formatWhen(product.createdAt)}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.bg,
    flex: 1,
  },
  loading: {
    alignItems: 'center',
    gap: 12,
    padding: 24,
    backgroundColor: colors.bg,
    flex: 1,
    justifyContent: 'center',
  },
  list: {
    flexGrow: 1,
    padding: 16,
    paddingBottom: 24,
  },
  header: {
    gap: 12,
    marginBottom: 14,
  },
  count: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '700',
  },
  search: {
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderRadius: 12,
    borderWidth: 1,
    color: colors.text,
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: 14,
  },
  filters: {
    gap: 8,
  },
  filter: {
    backgroundColor: colors.chip,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterOn: {
    backgroundColor: colors.navy,
  },
  filterText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  filterTextOn: {
    color: '#fff',
  },
  empty: {
    gap: 8,
    paddingTop: 28,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
  },
  emptyBody: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 23,
  },
  noMatch: {
    color: colors.muted,
    fontSize: 16,
    paddingTop: 12,
  },
  row: {
    backgroundColor: colors.card,
    borderRadius: 16,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
    padding: 10,
  },
  thumb: {
    backgroundColor: colors.chip,
    borderRadius: 12,
    height: 76,
    width: 76,
  },
  rowBody: {
    flex: 1,
    gap: 2,
    justifyContent: 'center',
  },
  category: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
  },
  meta: {
    color: colors.muted,
    fontSize: 14,
  },
  footer: {
    backgroundColor: colors.card,
    borderTopColor: colors.line,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  footerButton: {
    flex: 1,
  },
  overlay: {
    alignItems: 'center',
    backgroundColor: colors.overlay,
    bottom: 0,
    gap: 12,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  overlayText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
