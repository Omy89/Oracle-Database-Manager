# Oracle Database Manager

Herramienta administrativa para Oracle Database desarrollada en JavaScript utilizando Node.js y Express.js.

---

# Descripción

Oracle Database Manager es una aplicación web para la administración de bases de datos Oracle, interactuando directamente con las *system tables/views* del SGBD mediante consultas SQL nativas.

El proyecto fue desarrollado para la clase de Teoría de Base de Datos II, cumpliendo el requisito de utilizar metadata obtenida directamente desde Oracle, sin utilizar `information_schema` ni librerías ORM o frameworks de administración externos.

La aplicación permite:

- Gestión de múltiples conexiones Oracle
- Exploración visual de objetos de base de datos
- Ejecución de sentencias SQL
- Generación manual de DDL desde metadata
- Creación visual de tablas y vistas
- Administración de objetos Oracle desde una interfaz web

---

# Características

## Gestión de conexiones

- Inicio de sesión con cualquier usuario válido de Oracle
- Soporte para múltiples conexiones simultáneas
- Persistencia de conexiones utilizando `localStorage`
- Reconexión rápida desde el sidebar

## Explorador de objetos

La aplicación obtiene metadata directamente desde vistas del diccionario de datos Oracle:

- Tables
- Views
- Procedures
- Functions
- Packages
- Sequences
- Triggers
- Indexes
- Tablespaces
- Users

La interfaz presenta un árbol navegable dinámico con visualización tabular usando DataTables.

---

# Funcionalidades principales

## Ejecución de SQL

Editor SQL integrado con soporte para:

- `SELECT`
- `INSERT`
- `UPDATE`
- `DELETE`
- `CREATE`
- `ALTER`
- `DROP`
- Scripts SQL múltiples

### Características

- Ejecución de múltiples sentencias en una sola petición
- Resultados tabulares dinámicos
- Detección automática entre SELECT y DDL/DML
- `autoCommit` automático para DDL/DML
- Atajo `Ctrl + Enter` para ejecutar consultas

---

## Generación de DDL

El proyecto reconstruye manualmente el DDL de los objetos utilizando metadata obtenida desde las system tables/views de Oracle.

### No se utiliza:

- `information_schema`
- `DBMS_METADATA.GET_DDL`
- frameworks ORM
- librerías administrativas externas

El DDL es construido completamente desde el backend utilizando JavaScript y consultas SQL.

### Objetos soportados

- Tables
- Views
- Procedures
- Functions
- Packages
- Triggers
- Indexes
- Sequences

---

## Creación visual de objetos

### Creación de tablas

Incluye interfaz visual para:

- Definir columnas
- Tipos de datos Oracle
- Primary Keys
- NOT NULL
- DEFAULT values
- Precision y Scale para NUMBER

También incluye previsualización automática del SQL generado.

### Creación de vistas

- `CREATE VIEW`
- `CREATE OR REPLACE VIEW`
- Previsualización del SQL generado
- Ejecución directa desde la interfaz

---

# Tecnologías utilizadas

- Node.js
- Express.js
- Oracle Database XE
- HTML5
- CSS3
- JavaScript
- node-oracledb v6
- DataTables
- localStorage API

---

# Arquitectura del proyecto

## Backend

El backend fue desarrollado utilizando Express.js y OracleDB Driver (`node-oracledb`).

### Responsabilidades principales

- Gestión de conexiones Oracle
- Ejecución de SQL
- Obtención de metadata
- Reconstrucción de DDL
- APIs REST
- Conversión de tipos LONG

### Endpoints principales

| Endpoint | Descripción |
|---|---|
| `/api/connect` | Validar conexión Oracle |
| `/api/objects` | Obtener metadata de objetos |
| `/api/sql` | Ejecutar SQL |
| `/api/ddl` | Generar DDL |
| `/api/create-table` | Crear tablas |
| `/api/create-view` | Crear vistas |

---

## Frontend

Frontend desarrollado en JavaScript vanilla.

### Características

- Render dinámico del sidebar
- Modales para visualización DDL
- SQL Editor integrado
- Manejo dinámico del DOM
- Event delegation
- Persistencia local de conexiones

---

# System tables/views utilizadas

El proyecto interactúa directamente con metadata interna de Oracle.

## Importante

El proyecto **NO utiliza**:

- `information_schema`
- SQLAlchemy
- Hibernate
- Entity Framework
- Dapper
- ORMs
- herramientas administrativas Oracle

Toda la metadata se obtiene mediante consultas SQL directas sobre las vistas del diccionario Oracle.

| System Table/View | Uso |
|---|---|
| `ALL_TABLES` | Listar tablas |
| `ALL_VIEWS` | Listar vistas |
| `ALL_PROCEDURES` | Procedures, functions y packages |
| `ALL_SEQUENCES` | Secuencias |
| `ALL_TRIGGERS` | Triggers |
| `ALL_INDEXES` | Índices |
| `ALL_TAB_COLUMNS` | Columnas |
| `ALL_CONSTRAINTS` | Constraints |
| `ALL_CONS_COLUMNS` | Columnas de constraints |
| `ALL_IND_COLUMNS` | Columnas de índices |
| `ALL_SOURCE` | Código fuente PL/SQL |
| `DBA_TABLESPACES` | Tablespaces |
| `DBA_USERS` | Usuarios |

---

# Problemas técnicos y soluciones implementadas

## Manejo de múltiples conexiones

Uno de los principales problemas del proyecto fue almacenar múltiples conexiones Oracle desde la interfaz web.

### Problema

La aplicación necesitaba:

- almacenar varias conexiones
- permitir reconexión rápida
- mantener estado de conexión activo

### Solución

Se implementó persistencia utilizando `localStorage`.

Cada conexión guarda:

- host
- puerto
- servicio
- usuario
- contraseña

Esto permitió:

- restaurar conexiones rápidamente
- manejar múltiples instancias Oracle
- simplificar el flujo de autenticación

---

## Problemas con tipos LONG en Oracle

Oracle utiliza el tipo de dato `LONG` en varias system tables importantes.

### Columnas afectadas

| Vista | Columna LONG |
|---|---|
| `ALL_TAB_COLUMNS` | `DATA_DEFAULT` |
| `ALL_VIEWS` | `TEXT` |
| `ALL_TRIGGERS` | `TRIGGER_BODY` |
| `ALL_CONSTRAINTS` | `SEARCH_CONDITION` |

### Problema

Oracle genera errores como:

```sql
ORA-00997: illegal use of LONG datatype
```

cuando estas columnas son utilizadas incorrectamente.

### Solución implementada

Se utilizó `fetchTypeHandler` de `node-oracledb v6` para convertir automáticamente:

```js
DB_TYPE_LONG -> DB_TYPE_VARCHAR
```

durante la lectura de resultados.

### Implementación utilizada

```js
function long_opts(long_columns) {
    return {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
        fetchTypeHandler: (meta) => {
            if (long_columns.includes(meta.name)) {
                return { type: oracledb.DB_TYPE_VARCHAR };
            }
        }
    };
}
```

Esto permitió generar correctamente:

- DDL de tablas
- DDL de vistas
- cuerpos de triggers
- constraints CHECK

---

## Reconstrucción manual de DDL

Otro reto importante fue reconstruir el DDL completo de objetos Oracle utilizando únicamente metadata.

### Ejemplo: CREATE TABLE

Para generar tablas se combinó información desde:

- `ALL_TAB_COLUMNS`
- `ALL_CONSTRAINTS`
- `ALL_CONS_COLUMNS`

El backend reconstruye programáticamente:

- columnas
- tipos de datos
- precision y scale
- default values
- NOT NULL
- PRIMARY KEY
- UNIQUE
- FOREIGN KEY
- CHECK constraints

Todo el DDL es generado manualmente en Node.js.

---

# Instalación

## Clonar repositorio

```bash
git clone https://github.com/Omy89/Oracle-Database-Manager.git
```

## Instalar dependencias

```bash
npm install
```

---

# Configuración

Crear archivo `.env`:

```env
PORT=3000
```

Las credenciales Oracle se ingresan desde la interfaz web y no se almacenan en el backend.

---

# Ejecución

## Producción

```bash
npm start
```

## Desarrollo

```bash
npm run dev
```

---

# Requisitos

- Node.js >= 18
- Oracle Database XE o superior
- Oracle Instant Client (dependiendo del sistema operativo)

---

# Privilegios requeridos

Algunas vistas requieren privilegios DBA:

| Vista | Privilegio requerido |
|---|---|
| `DBA_USERS` | DBA o `SELECT_CATALOG_ROLE` |
| `DBA_TABLESPACES` | DBA o `SELECT_CATALOG_ROLE` |

Sin estos privilegios, dichas secciones aparecerán vacías.

---

# Seguridad y limitaciones

## Conexiones almacenadas

Las conexiones se almacenan en `localStorage`, incluyendo la contraseña.

Esto es aceptable para un entorno académico local, pero no es recomendable en producción.

---

## Limitaciones conocidas

- Oracle XE tiene limitaciones frente a versiones Enterprise
- Algunos objetos requieren privilegios DBA
- El proyecto depende de metadata accesible por el usuario conectado
- El manejo de tipos `LONG` requiere conversión manual

---

# Cumplimiento de requisitos del proyecto

## Requisitos cumplidos

- Gestión de múltiples conexiones
- Inicio de sesión Oracle
- Exploración de objetos
- Generación de DDL desde metadata
- Creación visual de tablas y vistas
- Ejecución de SQL
- Uso explícito de system tables
- Aplicación web
- Sin uso de `information_schema`
- Sin ORMs o frameworks prohibidos

---

# Autor

**Omar Romero Mejía**

Proyecto académico — Teoría de Base de Datos II

---

# Licencia

Uso académico.
