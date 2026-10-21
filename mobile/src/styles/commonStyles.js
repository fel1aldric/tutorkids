import { StyleSheet } from 'react-native';

export const commonStyles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  centered: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  label: {
    fontWeight: 'bold',
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    marginVertical: 6,
  },
  inputHalf: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginVertical: 4,
  },
  button: {
    flex: 1,
  },
  card: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  cardTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 4,
  },
  cardMeta: {
    color: '#555',
    marginBottom: 2,
  },
  empty: {
    color: '#888',
    fontStyle: 'italic',
    marginVertical: 8,
  },
  hint: {
    color: '#888',
    fontSize: 12,
    marginBottom: 4,
  },
});

export const chipStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 8,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#e0e0e0',
  },
  chipActive: {
    backgroundColor: '#2e7d32',
  },
  text: {
    color: '#333',
    fontSize: 12,
  },
  textActive: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
});
