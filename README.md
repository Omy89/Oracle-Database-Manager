# Oracle Database Manager

Herramienta administrativa para Oracle Database desarrollada en Node.js y JavaScript.

## Descripcion

Oracle Database Manager es una aplicacion web para la administracion de bases de datos Oracle,
interactuando directamente con las system tables del SGBD mediante consultas SQL nativas.

Desarrollado para la clase de Teoria de Base de Datos II.

## Caracteristicas

- Gestion de conexiones Oracle con soporte para multiples instancias
- Explorador de objetos de base de datos con tree navegable
- Ejecucion de consultas SQL (SELECT, DDL, DML)
- Generacion de DDL desde metadata via system tables
- Creacion visual de tablas y vistas
- Administracion de:
  - Tablas
  - Vistas
  - Procedimientos almacenados
  - Funciones
  - Paquetes
  - Secuencias
  - Triggers
  - Indices
  - Tablespaces
  - Usuarios

## Tecnologias utilizadas

- Node.js
- Express.js
- Oracle Database XE
- HTML / CSS / JavaScript
- node-oracledb v6
- DataTables (visualizacion de resultados)

## Requisitos

- Node.js >= 18
- Oracle Database XE o superior
- Oracle Instant Client (si aplica segun el sistema operativo)

## Instalacion

Clonar repositorio:

```bash
git clone https://github.com/Omy89/Oracle-Database-Manager.git
```

Instalar dependencias:

```bash
npm install
```

## Configuracion

Crear archivo `.env` en la raiz del proyecto:

```env
PORT=3000
```

Las credenciales de conexion se ingresan directamente desde la interfaz, no se almacenan en `.env`.

## Ejecutar proyecto

```bash
npm start
```

o en modo desarrollo con recarga automatica:

```bash
npm run dev
```

## System tables utilizadas

El proyecto interactua directamente con las siguientes system tables/views de Oracle.
No se utiliza `information_schema` ni ningun esquema estandarizado externo.

| System Table / View  | Uso                                              |
|----------------------|--------------------------------------------------|
| ALL_TABLES           | Listar tablas accesibles por el usuario          |
| ALL_VIEWS            | Listar vistas y obtener su texto (TEXT)          |
| ALL_PROCEDURES       | Listar procedimientos, funciones y paquetes      |
| ALL_SEQUENCES        | Listar secuencias y sus parametros               |
| ALL_TRIGGERS         | Listar triggers y obtener su cuerpo              |
| ALL_INDEXES          | Listar indices y sus columnas                    |
| ALL_TAB_COLUMNS      | Obtener columnas de tablas para generar DDL      |
| ALL_CONSTRAINTS      | Obtener constraints (PK, UK, FK, CHECK)          |
| ALL_CONS_COLUMNS     | Obtener columnas de cada constraint              |
| ALL_IND_COLUMNS      | Obtener columnas de cada indice                  |
| ALL_SOURCE           | Obtener codigo fuente de procedures y funciones  |
| DBA_TABLESPACES      | Listar tablespaces (requiere privilegio DBA)     |
| DBA_USERS            | Listar usuarios (requiere privilegio DBA)        |

## Generacion de DDL

El DDL de cada objeto se reconstruye manualmente desde las system tables anteriores.
**No se utiliza DBMS_METADATA ni ninguna funcion de administracion de Oracle.**

Ejemplo para tablas: se consultan `ALL_TAB_COLUMNS` para las columnas,
`ALL_CONSTRAINTS` + `ALL_CONS_COLUMNS` para los constraints,
y se construye el `CREATE TABLE` programaticamente en el backend (Node.js).

## Limitaciones conocidas

### Tipo de dato LONG en Oracle
Oracle almacena ciertas columnas de sus system tables como tipo `LONG`, un tipo de dato
antiguo con restricciones importantes:

- `ALL_TAB_COLUMNS.DATA_DEFAULT` — valor por defecto de columnas
- `ALL_VIEWS.TEXT` — cuerpo de la vista
- `ALL_TRIGGERS.TRIGGER_BODY` — cuerpo del trigger
- `ALL_CONSTRAINTS.SEARCH_CONDITION` — condicion de constraints CHECK

Estas columnas **no pueden usarse en funciones SQL, GROUP BY, ni expresiones**.
La solucion implementada es usar `fetchTypeHandler` de node-oracledb v6,
que convierte `DB_TYPE_LONG` a `DB_TYPE_VARCHAR` en el momento de lectura,
evitando el error `ORA-00997: illegal use of LONG datatype`.

Adicionalmente, `SEARCH_CONDITION` no puede combinarse con `LISTAGG` en la misma query,
por lo que los constraints CHECK se consultan en una query separada.

### Privilegios requeridos
- `DBA_TABLESPACES` y `DBA_USERS` requieren privilegios DBA o `SELECT_CATALOG_ROLE`.
- Sin esos privilegios, las secciones de Tablespaces y Users no mostraran datos.

### Conexiones guardadas
Las conexiones se almacenan en `localStorage` del navegador, incluyendo la contrasena.
Esto es aceptable para un entorno academico local, pero no es recomendable en produccion.

### Soporte de objetos
Todos los tipos de objetos indicados en la rubrica aplican para Oracle XE.
No hay objetos que deban justificarse como no aplicables.

## Autor

Omar Romero Mejia

## Licencia

Proyecto academico — Teoria de Base de Datos II
