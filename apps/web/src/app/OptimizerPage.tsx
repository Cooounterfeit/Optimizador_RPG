import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import { getCatalogRepository } from '../features/catalog/catalog-repository';
import { SimplePage } from './SimplePage';

export function OptimizerPage() {
  const { id = '' } = useParams();
  const [name, setName] = useState('');

  useEffect(() => {
    let alive = true;

    getCatalogRepository()
      .list()
      .then((list) => {
        const match = list.find((optimizer) => optimizer.id === id);
        if (alive && match) setName(match.name);
      })
      .catch(() => undefined);

    return () => {
      alive = false;
    };
  }, [id]);

  return (
    <SimplePage title={name || id} note="The optimizer screen arrives with the solver wiring." />
  );
}
